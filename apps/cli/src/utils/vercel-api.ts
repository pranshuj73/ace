/**
 * Vercel Skills API Client
 * Interfaces with skills.sh API for skill discovery and search
 */

const SKILLS_API_BASE = process.env.SKILLS_API_URL || "https://skills.sh";

export interface VercelSkill {
  id: string;
  name: string;
  installs: number;
  topSource: string | null;
}

export interface VercelSearchResponse {
  skills: VercelSkill[];
}

export interface VercelMatchResult {
  source: string;
  skillId: string;
  name: string;
  installs: number;
  score: number;
  sourceUrl?: string;
}

export interface VercelFuzzyMatchResponse {
  matches: Record<string, VercelMatchResult | null>;
}

/**
 * Search for skills by keyword using Vercel's API
 * @param query - Search query
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of matching skills
 */
export async function searchSkillsVercel(
  query: string,
  limit: number = 10,
): Promise<VercelSkill[]> {
  try {
    const url = `${SKILLS_API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(
        `Vercel API search failed: ${res.status} ${res.statusText}`,
      );
      return [];
    }

    const data = (await res.json()) as VercelSearchResponse;
    return data.skills || [];
  } catch (error) {
    console.warn(
      `Failed to search skills via Vercel API:`,
      error instanceof Error ? error.message : error,
    );
    return [];
  }
}

/**
 * Fuzzy match skill names to find their sources
 * @param skillNames - Array of skill names to match
 * @returns Record mapping skill names to match results
 */
export async function fuzzyMatchSkillsVercel(
  skillNames: string[],
): Promise<Record<string, VercelMatchResult | null>> {
  if (skillNames.length === 0) return {};

  try {
    const response = await fetch(`${SKILLS_API_BASE}/api/skills/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills: skillNames }),
    });

    if (!response.ok) {
      console.warn(
        `Vercel API fuzzy match failed: ${response.status} ${response.statusText}`,
      );
      return {};
    }

    const data = (await response.json()) as VercelFuzzyMatchResponse;
    return data.matches || {};
  } catch (error) {
    console.warn(
      `Failed to fuzzy match skills via Vercel API:`,
      error instanceof Error ? error.message : error,
    );
    return {};
  }
}

/**
 * Search for skills related to a package name
 * @param packageName - npm package name (e.g., "react", "next")
 * @param limit - Maximum number of results
 * @returns Array of relevant skills
 */
export async function searchSkillsByPackage(
  packageName: string,
  limit: number = 10,
): Promise<VercelSkill[]> {
  return searchSkillsVercel(packageName, limit);
}

/**
 * Batch search for skills across multiple packages
 * @param packageNames - Array of package names
 * @param maxPerPackage - Max results per package (default: 5)
 * @returns Map of package name to matching skills
 */
export async function batchSearchByPackages(
  packageNames: string[],
  maxPerPackage: number = 5,
): Promise<Map<string, VercelSkill[]>> {
  const results = new Map<string, VercelSkill[]>();

  // Search in parallel with rate limiting (don't spam the API)
  const batchSize = 5;
  for (let i = 0; i < packageNames.length; i += batchSize) {
    const batch = packageNames.slice(i, i + batchSize);
    const promises = batch.map((pkg) =>
      searchSkillsByPackage(pkg, maxPerPackage).then((skills) => ({
        pkg,
        skills,
      })),
    );

    const batchResults = await Promise.all(promises);
    for (const { pkg, skills } of batchResults) {
      results.set(pkg, skills);
    }

    // Small delay between batches to be nice to the API
    if (i + batchSize < packageNames.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
