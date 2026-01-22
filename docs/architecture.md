# Database Architecture for Large-Scale Upskill

## Overview

This document outlines the database schema and API design for scaling the upskill CLI to handle large-scale usage.

## Database Schema

### Core Tables

#### 1. `packages`
```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,  -- e.g., "react", "expo"
  description TEXT,
  npm_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_packages_name ON packages(name);
```

#### 2. `skills`
```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id VARCHAR(255) NOT NULL UNIQUE,  -- e.g., "vercel-react-best-practices"
  title VARCHAR(500) NOT NULL,
  description TEXT,
  repo VARCHAR(255) NOT NULL,  -- e.g., "vercel-labs/agent-skills"
  installs INTEGER DEFAULT 0,
  source_url VARCHAR(500),  -- URL to skills.sh page
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_skills_skill_id ON skills(skill_id);
CREATE INDEX idx_skills_repo ON skills(repo);
CREATE INDEX idx_skills_installs ON skills(installs DESC);
CREATE INDEX idx_skills_active ON skills(is_active) WHERE is_active = TRUE;
```

#### 3. `package_skill_mappings` (Many-to-Many)
```sql
CREATE TABLE package_skill_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3,2) DEFAULT 1.0,  -- 0.0-1.0, for ML/ranking later
  mapping_source VARCHAR(50) DEFAULT 'inferred',  -- 'manual', 'inferred', 'ml'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(package_id, skill_id)
);

CREATE INDEX idx_mappings_package ON package_skill_mappings(package_id);
CREATE INDEX idx_mappings_skill ON package_skill_mappings(skill_id);
CREATE INDEX idx_mappings_confidence ON package_skill_mappings(confidence_score DESC);
```

### Extended Tables (for future features)

#### 4. `tags`
```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,  -- e.g., "react", "frontend", "testing"
  category VARCHAR(50),  -- e.g., "framework", "category", "tool"
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tags_name ON tags(name);
```

#### 5. `skill_tags` (Many-to-Many)
```sql
CREATE TABLE skill_tags (
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, tag_id)
);

CREATE INDEX idx_skill_tags_skill ON skill_tags(skill_id);
CREATE INDEX idx_skill_tags_tag ON skill_tags(tag_id);
```

#### 6. `skill_versions` (for versioning/updates)
```sql
CREATE TABLE skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,  -- semantic version or commit hash
  changelog TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(skill_id, version)
);

CREATE INDEX idx_skill_versions_skill ON skill_versions(skill_id);
```

#### 7. `user_skill_preferences` (for user-specific overrides)
```sql
CREATE TABLE user_skill_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,  -- or UUID if you have user auth
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  preferred_agents TEXT[],  -- ['cursor', 'windsurf']
  preferred_scope VARCHAR(20) DEFAULT 'project',  -- 'project' or 'global'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, skill_id)
);

CREATE INDEX idx_user_prefs_user ON user_skill_preferences(user_id);
CREATE INDEX idx_user_prefs_skill ON user_skill_preferences(skill_id);
```

#### 8. `analytics` (for tracking usage)
```sql
CREATE TABLE analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,  -- 'suggested', 'installed', 'viewed'
  user_id VARCHAR(255),
  metadata JSONB,  -- flexible metadata storage
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analytics_skill ON analytics(skill_id);
CREATE INDEX idx_analytics_package ON analytics(package_id);
CREATE INDEX idx_analytics_event ON analytics(event_type);
CREATE INDEX idx_analytics_created ON analytics(created_at);
```

## API Design

### REST API Endpoints

#### Core Queries

**GET /api/v1/skills/suggest**
- Query params: `packages[]` (array of package names)
- Returns: List of skills matching the packages
- Example: `GET /api/v1/skills/suggest?packages=react&packages=next`

**GET /api/v1/skills/:skillId**
- Returns: Full skill details with packages and tags

**GET /api/v1/packages/:packageName/skills**
- Returns: All skills mapped to a package

**GET /api/v1/skills**
- Query params: `tag`, `repo`, `limit`, `offset`, `sort`
- Returns: Filtered/paginated list of skills

#### Bulk Operations

**POST /api/v1/skills/bulk-suggest**
- Body: `{ packages: string[] }`
- Returns: Skills grouped by package matches

**POST /api/v1/analytics/track**
- Body: `{ event_type, skill_id?, package_id?, metadata? }`
- For tracking usage

### GraphQL Alternative (if you prefer)

```graphql
type Query {
  suggestSkills(packages: [String!]!): [Skill!]!
  skill(id: String!): Skill
  package(name: String!): Package
}

type Skill {
  id: ID!
  skillId: String!
  title: String!
  description: String!
  repo: String!
  installs: Int!
  packages: [Package!]!
  tags: [Tag!]!
}

type Package {
  id: ID!
  name: String!
  skills: [Skill!]!
}
```

## Caching Strategy

### Redis Cache Layer

1. **Package → Skills mapping cache**
   - Key: `pkg:skills:{package_name}`
   - TTL: 1 hour (or until skill update)
   - Invalidate on skill/package updates

2. **Skill details cache**
   - Key: `skill:{skill_id}`
   - TTL: 30 minutes

3. **Popular queries cache**
   - Key: `query:popular:{hash_of_packages}`
   - TTL: 15 minutes
   - Cache top 100 most common package combinations

### Cache Invalidation Strategy

- On skill update: Invalidate all package caches that reference it
- On mapping update: Invalidate package caches
- Scheduled refresh: Daily full cache warm-up

## Performance Optimizations

1. **Materialized Views** (PostgreSQL)
   ```sql
   CREATE MATERIALIZED VIEW skill_package_summary AS
   SELECT 
     s.id as skill_id,
     s.skill_id,
     s.title,
     s.installs,
     array_agg(p.name) as package_names,
     array_agg(psm.confidence_score) as confidence_scores
   FROM skills s
   JOIN package_skill_mappings psm ON s.id = psm.skill_id
   JOIN packages p ON psm.package_id = p.id
   WHERE s.is_active = TRUE
   GROUP BY s.id, s.skill_id, s.title, s.installs;
   
   CREATE INDEX ON skill_package_summary USING GIN(package_names);
   REFRESH MATERIALIZED VIEW CONCURRENTLY skill_package_summary;
   ```

2. **Full-Text Search** (for skill search)
   ```sql
   ALTER TABLE skills ADD COLUMN search_vector tsvector;
   CREATE INDEX idx_skills_search ON skills USING GIN(search_vector);
   
   -- Update trigger to maintain search_vector
   ```

3. **Read Replicas** for scaling read queries

## CLI Integration

### API Client Module

```typescript
// src/api/client.ts
class UpskillAPI {
  constructor(private baseURL: string, private apiKey?: string) {}
  
  async suggestSkills(packages: string[]): Promise<Skill[]> {
    const response = await fetch(
      `${this.baseURL}/api/v1/skills/suggest?${packages.map(p => `packages=${p}`).join('&')}`
    );
    return response.json();
  }
  
  async getSkill(skillId: string): Promise<Skill> {
    const response = await fetch(`${this.baseURL}/api/v1/skills/${skillId}`);
    return response.json();
  }
}
```

### Offline Mode Support

- Cache recent API responses locally
- Fallback to local registry if API unavailable
- Background sync when online

## Migration Path

1. **Phase 1**: Keep local JSON, add API as optional
   - CLI checks for API endpoint
   - Falls back to local if unavailable

2. **Phase 2**: Hybrid mode
   - Use API for queries
   - Local JSON for offline/backup

3. **Phase 3**: Full API mode
   - Remove local JSON dependency
   - All queries go through API

## Database Choice Recommendations

### Option 1: PostgreSQL (Recommended)
- **Pros**: Excellent JSON support, full-text search, mature ecosystem
- **Cons**: Requires more setup
- **Best for**: Complex queries, analytics, full-text search

### Option 2: SQLite (for MVP/self-hosted)
- **Pros**: Zero setup, file-based, good for small scale
- **Cons**: Limited concurrency, no network access
- **Best for**: MVP, single-user deployments

### Option 3: MongoDB (if you prefer NoSQL)
- **Pros**: Flexible schema, good for nested data
- **Cons**: Less structured, harder joins
- **Best for**: Rapid prototyping, document-heavy data

## Recommended Stack

- **Database**: PostgreSQL (with pgvector if you want ML embeddings later)
- **API**: Fastify/Express (Node.js) or Hono (Bun)
- **Cache**: Redis
- **ORM**: Drizzle ORM or Prisma
- **Search**: PostgreSQL full-text search or Elasticsearch (if needed)

## Security Considerations

1. **Rate Limiting**: Per-IP/user rate limits on API
2. **API Keys**: Optional API keys for authenticated users
3. **Input Validation**: Sanitize package names, prevent SQL injection
4. **CORS**: Configure CORS for web clients if needed

## Future Enhancements

1. **ML-based ranking**: Use confidence scores to rank suggestions
2. **Package version matching**: Match skills to specific package versions
3. **Skill compatibility**: Detect conflicting skills
4. **User feedback loop**: Collect install/usage feedback to improve mappings
5. **Skill recommendations**: "Users who installed X also installed Y"
