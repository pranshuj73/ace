/**
 * Smart skill suggestion logic
 * Combines package.json analysis, installed skills detection, and Vercel API
 */

import { readPackageJson } from "@/utils/package-json";
import { getInstalledSkills } from "@/utils/installed-skills";
import { type AgentId } from "@/utils/agents";
import {
  batchSearchByPackages,
  fuzzyMatchSkillsVercel,
} from "@/utils/vercel-api";
import { suggestSkills as suggestSkillsOwnAPI } from "@/utils/api";

export interface EnrichedSkill {
  name: string;
  title: string;
  description: string | null;
  repo: string;
  source: string | null;
  installs: number;
  packages: string[];
  matchType: "package_json" | "installed_skill" | "search";
  relevanceScore: number;
}

export interface SuggestionResult {
  skills: EnrichedSkill[];
  total: number;
  matchedPackages: string[];
  matchedInstalledSkills: string[];
  sourcedFrom: "vercel" | "own-api" | "hybrid";
}

/**
 * Main suggestion orchestrator
 * Uses Vercel API as primary source with our own API as optional enhancement
 */
export async function generateSuggestions(
  cwd: string,
  agents?: AgentId[],
  scope: "project" | "global" | "both" = "project",
  limit: number = 10,
): Promise<SuggestionResult> {
  // 1. Gather context
  const packages = await readPackageJson(cwd);
  const installedSkills = getInstalledSkills(cwd, agents, scope);

  if (packages.length === 0 && installedSkills.length === 0) {
    return {
      skills: [],
      total: 0,
      matchedPackages: [],
      matchedInstalledSkills: [],
      sourcedFrom: "vercel",
    };
  }

  // 2. Try our own API first (if available)
  let ownAPIResults: EnrichedSkill[] = [];
  let sourcedFrom: "vercel" | "own-api" | "hybrid" = "vercel";

  try {
    const apiData = await suggestSkillsOwnAPI(packages, installedSkills, limit);
    if (!apiData?.skills) {
      throw new Error("Invalid API response");
    }
    ownAPIResults = apiData.skills.map((skill) => ({
      name: skill.name,
      title: skill.title,
      description: skill.description,
      repo: skill.repo,
      source: skill.repo,
      installs: skill.installs,
      packages: skill.packages,
      matchType: skill.match_type,
      relevanceScore: calculateRelevanceScore(skill.installs, skill.match_type),
    }));

    if (ownAPIResults.length > 0) {
      sourcedFrom = "own-api";
      return {
        skills: ownAPIResults.slice(0, limit),
        total: apiData.total,
        matchedPackages: apiData.matched_packages,
        matchedInstalledSkills: apiData.matched_installed_skills,
        sourcedFrom,
      };
    }
  } catch {
    // Own API failed or unavailable, fall back to Vercel silently
  }

  // 3. Use Vercel API as fallback/primary
  const vercelResults = await generateSuggestionsFromVercel(
    packages,
    installedSkills,
    limit,
  );

  // 4. If we have both, merge and deduplicate
  if (ownAPIResults.length > 0 && vercelResults.skills.length > 0) {
    sourcedFrom = "hybrid";
    const merged = mergeAndDeduplicate(ownAPIResults, vercelResults.skills);
    return {
      skills: merged.slice(0, limit),
      total: merged.length,
      matchedPackages: vercelResults.matchedPackages,
      matchedInstalledSkills: vercelResults.matchedInstalledSkills,
      sourcedFrom,
    };
  }

  return {
    ...vercelResults,
    sourcedFrom,
  };
}

/**
 * Generate suggestions using Vercel's API
 */
async function generateSuggestionsFromVercel(
  packages: string[],
  installedSkills: string[],
  limit: number,
): Promise<SuggestionResult> {
  const skillsMap = new Map<string, EnrichedSkill>();
  const matchedPackages: string[] = [];

  // Search Vercel API for each package
  const packageResults = await batchSearchByPackages(packages, 5);

  for (const [pkg, skills] of packageResults) {
    if (skills.length > 0) {
      matchedPackages.push(pkg);
    }

    for (const skill of skills) {
      const key = `${skill.name}-${skill.topSource || skill.id}`;
      if (!skillsMap.has(key)) {
        skillsMap.set(key, {
          name: skill.name,
          title: skill.name, // Vercel API doesn't provide title, use name
          description: null,
          repo: skill.topSource || skill.id,
          source: skill.topSource,
          installs: skill.installs,
          packages: [pkg],
          matchType: "package_json",
          relevanceScore: calculateRelevanceScore(
            skill.installs,
            "package_json",
          ),
        });
      } else {
        // Skill already found for another package, add this package to the list
        const existing = skillsMap.get(key)!;
        existing.packages.push(pkg);
        // Boost relevance score for multi-package matches
        existing.relevanceScore += 100;
      }
    }
  }

  // If we have installed skills, try to find related skills
  const matchedInstalledSkills: string[] = [];
  if (installedSkills.length > 0) {
    const matches = await fuzzyMatchSkillsVercel(installedSkills);

    for (const [skillName, match] of Object.entries(matches)) {
      if (match && match.score >= 1000) {
        // Exact match threshold
        matchedInstalledSkills.push(skillName);

        // Search for skills from the same source
        if (match.source) {
          const relatedSkills = await batchSearchByPackages([match.source], 3);
          for (const [, skills] of relatedSkills) {
            for (const skill of skills) {
              const key = `${skill.name}-${skill.topSource || skill.id}`;
              if (
                !skillsMap.has(key) &&
                skill.name !== skillName && // Don't suggest already installed
                !installedSkills.includes(skill.name)
              ) {
                skillsMap.set(key, {
                  name: skill.name,
                  title: skill.name,
                  description: null,
                  repo: skill.topSource || skill.id,
                  source: skill.topSource,
                  installs: skill.installs,
                  packages: [],
                  matchType: "installed_skill",
                  relevanceScore: calculateRelevanceScore(
                    skill.installs,
                    "installed_skill",
                  ),
                });
              }
            }
          }
        }
      }
    }
  }

  // Convert to array and sort by relevance
  const allSkills = Array.from(skillsMap.values()).sort(
    (a, b) => b.relevanceScore - a.relevanceScore,
  );

  return {
    skills: allSkills.slice(0, limit),
    total: allSkills.length,
    matchedPackages,
    matchedInstalledSkills,
    sourcedFrom: "vercel",
  };
}

/**
 * Calculate relevance score for ranking
 */
function calculateRelevanceScore(
  installs: number,
  matchType: "package_json" | "installed_skill" | "search",
): number {
  const baseScore = Math.log10(installs + 1) * 100; // Logarithmic scale for installs

  // Boost package.json matches
  if (matchType === "package_json") {
    return baseScore + 1000;
  }

  // Installed skill matches get medium boost
  if (matchType === "installed_skill") {
    return baseScore + 500;
  }

  return baseScore;
}

/**
 * Merge and deduplicate skills from different sources
 */
function mergeAndDeduplicate(
  ownAPI: EnrichedSkill[],
  vercel: EnrichedSkill[],
): EnrichedSkill[] {
  const map = new Map<string, EnrichedSkill>();

  // Add own API results first (they're more accurate)
  for (const skill of ownAPI) {
    const key = skill.name.toLowerCase();
    map.set(key, skill);
  }

  // Add Vercel results if not already present
  for (const skill of vercel) {
    const key = skill.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, skill);
    }
  }

  // Sort by relevance score
  return Array.from(map.values()).sort(
    (a, b) => b.relevanceScore - a.relevanceScore,
  );
}
