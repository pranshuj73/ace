/**
 * Example API Implementation (Hono + Drizzle ORM)
 * This shows how the API would look in practice
 */

import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray, sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema'; // Your Drizzle schema

const app = new Hono();

// Database connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Redis cache (example with ioredis)
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

/**
 * GET /api/v1/skills/suggest?packages=react&packages=next
 * 
 * Returns skills that match the provided packages
 */
app.get('/api/v1/skills/suggest', async (c) => {
  const packages = c.req.query('packages')?.split(',') || [];
  const limit = parseInt(c.req.query('limit') || '10');
  const sort = c.req.query('sort') || 'installs'; // 'installs' | 'confidence'

  if (packages.length === 0) {
    return c.json({ error: 'packages parameter required' }, 400);
  }

  // Check cache first
  const cacheKey = `suggest:${packages.sort().join(',')}:${limit}:${sort}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json(JSON.parse(cached));
  }

  // Query database
  const skills = await db
    .select({
      skillId: schema.skills.skillId,
      title: schema.skills.title,
      description: schema.skills.description,
      repo: schema.skills.repo,
      installs: schema.skills.installs,
      packages: sql<string[]>`array_agg(${schema.packages.name})`,
      tags: sql<string[]>`array_agg(DISTINCT ${schema.tags.name})`,
      confidence: sql<number>`MAX(${schema.packageSkillMappings.confidenceScore})`,
    })
    .from(schema.skills)
    .innerJoin(
      schema.packageSkillMappings,
      eq(schema.skills.id, schema.packageSkillMappings.skillId)
    )
    .innerJoin(
      schema.packages,
      eq(schema.packageSkillMappings.packageId, schema.packages.id)
    )
    .leftJoin(
      schema.skillTags,
      eq(schema.skills.id, schema.skillTags.skillId)
    )
    .leftJoin(
      schema.tags,
      eq(schema.skillTags.tagId, schema.tags.id)
    )
    .where(
      sql`${schema.packages.name} = ANY(${packages}) AND ${schema.skills.isActive} = TRUE`
    )
    .groupBy(schema.skills.id)
    .orderBy(
      sort === 'installs'
        ? schema.skills.installs
        : schema.packageSkillMappings.confidenceScore
    )
    .limit(limit);

  // Count total matches
  const totalResult = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${schema.skills.id})` })
    .from(schema.skills)
    .innerJoin(
      schema.packageSkillMappings,
      eq(schema.skills.id, schema.packageSkillMappings.skillId)
    )
    .innerJoin(
      schema.packages,
      eq(schema.packageSkillMappings.packageId, schema.packages.id)
    )
    .where(
      sql`${schema.packages.name} = ANY(${packages}) AND ${schema.skills.isActive} = TRUE`
    );

  const response = {
    skills,
    total: totalResult[0]?.count || 0,
    query: {
      packages,
      matched_packages: packages.length,
    },
  };

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(response));

  return c.json(response);
});

/**
 * GET /api/v1/skills/:skillId
 * 
 * Get full details of a specific skill
 */
app.get('/api/v1/skills/:skillId', async (c) => {
  const skillId = c.req.param('skillId');

  const cacheKey = `skill:${skillId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json(JSON.parse(cached));
  }

  const skill = await db.query.skills.findFirst({
    where: eq(schema.skills.skillId, skillId),
    with: {
      packageMappings: {
        with: {
          package: true,
        },
      },
      tags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!skill) {
    return c.json({ error: 'Skill not found' }, 404);
  }

  // Cache for 30 minutes
  await redis.setex(cacheKey, 1800, JSON.stringify(skill));

  return c.json(skill);
});

/**
 * GET /api/v1/packages/:packageName/skills
 * 
 * Get all skills for a specific package
 */
app.get('/api/v1/packages/:packageName/skills', async (c) => {
  const packageName = c.req.param('packageName');
  const limit = parseInt(c.req.query('limit') || '50');

  const cacheKey = `pkg:skills:${packageName}:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json(JSON.parse(cached));
  }

  const skills = await db
    .select({
      skillId: schema.skills.skillId,
      title: schema.skills.title,
      repo: schema.skills.repo,
      installs: schema.skills.installs,
      confidence: schema.packageSkillMappings.confidenceScore,
    })
    .from(schema.skills)
    .innerJoin(
      schema.packageSkillMappings,
      eq(schema.skills.id, schema.packageSkillMappings.skillId)
    )
    .innerJoin(
      schema.packages,
      eq(schema.packageSkillMappings.packageId, schema.packages.id)
    )
    .where(
      sql`${schema.packages.name} = ${packageName} AND ${schema.skills.isActive} = TRUE`
    )
    .orderBy(schema.skills.installs)
    .limit(limit);

  // Cache for 1 hour
  await redis.setex(cacheKey, 3600, JSON.stringify(skills));

  return c.json({ package: packageName, skills });
});

/**
 * POST /api/v1/analytics/track
 * 
 * Track skill suggestions/installs for analytics
 */
app.post('/api/v1/analytics/track', async (c) => {
  const body = await c.req.json();
  const { event_type, skill_id, package_id, metadata } = body;

  // Async insert (don't block response)
  db.insert(schema.analytics).values({
    skillId: skill_id,
    packageId: package_id,
    eventType: event_type,
    metadata: metadata || {},
  }).then(() => {
    // Successfully tracked
  }).catch((err) => {
    console.error('Analytics tracking error:', err);
  });

  return c.json({ success: true });
});

/**
 * GET /api/v1/stats
 * 
 * Get registry statistics
 */
app.get('/api/v1/stats', async (c) => {
  const cacheKey = 'stats:global';
  const cached = await redis.get(cacheKey);
  if (cached) {
    return c.json(JSON.parse(cached));
  }

  const [skillCount, packageCount, mappingCount, topPackages] = await Promise.all([
    // Total skills
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.skills),
    
    // Total packages
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.packages),
    
    // Total mappings
    db.select({ count: sql<number>`COUNT(*)` }).from(schema.packageSkillMappings),
    
    // Top packages by skill count
    db
      .select({
        package: schema.packages.name,
        skillCount: sql<number>`COUNT(${schema.packageSkillMappings.skillId})`,
      })
      .from(schema.packages)
      .innerJoin(
        schema.packageSkillMappings,
        eq(schema.packages.id, schema.packageSkillMappings.packageId)
      )
      .groupBy(schema.packages.id)
      .orderBy(sql`COUNT(${schema.packageSkillMappings.skillId}) DESC`)
      .limit(10),
  ]);

  const stats = {
    skills: skillCount[0]?.count || 0,
    packages: packageCount[0]?.count || 0,
    mappings: mappingCount[0]?.count || 0,
    topPackages,
  };

  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(stats));

  return c.json(stats);
});

export default app;
