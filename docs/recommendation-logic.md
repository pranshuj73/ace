# Recommendation Logic (Rule-Based)

## Two-Tier Matching System

### Tier 1: Package.json Matches (Highest Priority)
Match skills where `targetPackages` intersect with `package.json` dependencies.

### Tier 2: Installed Skills Matches (Secondary)
If user has `expo` skill installed, suggest other expo-related skills by finding skills that share packages.

## Implementation

### 1. Detect Installed Skills

```typescript
// src/utils/installed-skills.ts
import fs from 'node:fs';
import path from 'node:path';

type AgentId = 'cursor' | 'gemini' | 'windsurf' | 'agent';

function getInstalledSkills(
  cwd: string,
  agents: AgentId[] = ['cursor', 'gemini', 'windsurf', 'agent']
): string[] {
  const installed: string[] = [];
  
  for (const agent of agents) {
    // Check project-level
    const projectPath = path.join(cwd, `.${agent}`, 'skills');
    if (fs.existsSync(projectPath)) {
      const skills = fs.readdirSync(projectPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      installed.push(...skills);
    }
    
    // Check global-level (home directory)
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir) {
      const globalPath = path.join(homeDir, `.${agent}`, 'skills');
      if (fs.existsSync(globalPath)) {
        const skills = fs.readdirSync(globalPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        installed.push(...skills);
      }
    }
  }
  
  // Deduplicate
  return [...new Set(installed)];
}
```

### 2. Recommendation Query

```sql
-- Get skills matching package.json
WITH package_matches AS (
  SELECT DISTINCT 
    s.id, 
    s.skill_id, 
    s.title, 
    s.description,
    s.repo,
    s.installs,
    array_agg(p.name) as packages
  FROM skills s
  JOIN package_skill_mappings psm ON s.id = psm.skill_id
  JOIN packages p ON psm.package_id = p.id
  WHERE p.name = ANY($1)  -- $1 = ['react', 'expo'] from package.json
    AND s.is_active = TRUE
  GROUP BY s.id, s.skill_id, s.title, s.description, s.repo, s.installs
),
-- Get skills related to installed skills
installed_skill_matches AS (
  SELECT DISTINCT 
    s2.id,
    s2.skill_id,
    s2.title,
    s2.description,
    s2.repo,
    s2.installs,
    array_agg(p2.name) as packages
  FROM skills s1
  JOIN package_skill_mappings psm1 ON s1.id = psm1.skill_id
  JOIN packages p1 ON psm1.package_id = p1.id
  JOIN package_skill_mappings psm2 ON p1.id = psm2.package_id
  JOIN skills s2 ON psm2.skill_id = s2.id
  JOIN packages p2 ON psm2.package_id = p2.id
  WHERE s1.skill_id = ANY($2)  -- $2 = ['expo-some-skill'] (installed)
    AND s2.id != s1.id
    AND s2.is_active = TRUE
  GROUP BY s2.id, s2.skill_id, s2.title, s2.description, s2.repo, s2.installs
)
-- Combine results
SELECT 
  COALESCE(pm.skill_id, ism.skill_id) as skill_id,
  COALESCE(pm.title, ism.title) as title,
  COALESCE(pm.description, ism.description) as description,
  COALESCE(pm.repo, ism.repo) as repo,
  COALESCE(pm.installs, ism.installs) as installs,
  COALESCE(pm.packages, ism.packages) as packages,
  CASE 
    WHEN pm.id IS NOT NULL THEN 'package_json'
    ELSE 'installed_skill'
  END as match_type
FROM package_matches pm
FULL OUTER JOIN installed_skill_matches ism ON pm.id = ism.id
WHERE COALESCE(pm.skill_id, ism.skill_id) NOT IN ($3)  -- $3 = exclude already installed
ORDER BY 
  CASE WHEN pm.id IS NOT NULL THEN 0 ELSE 1 END,  -- package.json matches first
  COALESCE(pm.installs, ism.installs) DESC         -- then rank by installs
LIMIT $4;  -- $4 = limit
```

## Tags: Optional Auto-Generated

**Current use**: Auto-generated in `inferTags()` function for filtering

**Options**:
1. **Keep tags** - Auto-generate from skill name/repo/package context (current approach)
   - Useful for: `upskill review --tag frontend`
   - Not used for recommendations, just filtering/search

2. **Remove tags** - If not needed, can filter by:
   - Package matches
   - Repo
   - Installs count

**Recommendation**: Keep tags as auto-generated metadata (no user input), but make them optional. They're useful for the `review` command filtering but not essential for recommendations.

## Ranking

**Single metric**: `installs` count from skills table
- Higher installs = more popular = higher rank
- No confidence scores needed
- No ML needed
- Simple, transparent, rule-based

## Example Flow

1. User runs `upskill suggest`
2. CLI reads `package.json` → finds `["react", "expo"]`
3. CLI checks installed skills → finds `["expo-some-skill"]` in `.cursor/skills/`
4. CLI calls API: `GET /api/v1/skills/suggest?packages=react,expo&installed_skills=expo-some-skill`
5. API returns:
   - First: Skills matching `react` or `expo` (from package.json) - ranked by installs
   - Second: Skills related to `expo-some-skill` (sharing packages) - ranked by installs
6. CLI displays suggestions with `match_type` indicator
