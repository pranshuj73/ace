# Simplified Database Architecture

## Core Philosophy
- **Rule-based recommendations only** (no ML)
- **Ranking by installs** (from skills table)
- **Two-tier matching**: package.json first, then installed skills
- **No user-maintained data** (everything auto-generated)

## Simplified Schema

### 1. `packages`
```sql
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,  -- e.g., "react", "expo"
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_packages_name ON packages(name);
```

### 2. `skills`
```sql
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id VARCHAR(255) NOT NULL UNIQUE,  -- e.g., "vercel-react-best-practices"
  title VARCHAR(500) NOT NULL,
  description TEXT,
  repo VARCHAR(255) NOT NULL,  -- e.g., "vercel-labs/agent-skills"
  installs INTEGER DEFAULT 0,  -- Tracked from skills.sh, used for ranking
  source_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_skills_skill_id ON skills(skill_id);
CREATE INDEX idx_skills_repo ON skills(repo);
CREATE INDEX idx_skills_installs ON skills(installs DESC);  -- For ranking
CREATE INDEX idx_skills_active ON skills(is_active) WHERE is_active = TRUE;
```

### 3. `package_skill_mappings` (Many-to-Many)
```sql
CREATE TABLE package_skill_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  mapping_source VARCHAR(50) DEFAULT 'inferred',  -- 'manual' or 'inferred' (for debugging)
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(package_id, skill_id)
);

CREATE INDEX idx_mappings_package ON package_skill_mappings(package_id);
CREATE INDEX idx_mappings_skill ON package_skill_mappings(skill_id);
```

## Recommendation Logic

### Priority Order:
1. **Package.json matches** (highest priority)
   - Find skills where `targetPackages` intersect with `package.json` dependencies
   - Rank by `installs` DESC

2. **Installed skills matches** (secondary)
   - If user has `expo` skill installed, suggest other expo-related skills
   - Find skills that share packages with already-installed skills
   - Rank by `installs` DESC

### Query Example:
```sql
-- Step 1: Get skills matching package.json
WITH package_matches AS (
  SELECT DISTINCT s.id, s.skill_id, s.title, s.installs
  FROM skills s
  JOIN package_skill_mappings psm ON s.id = psm.skill_id
  JOIN packages p ON psm.package_id = p.id
  WHERE p.name = ANY($1)  -- $1 = ['react', 'expo']
    AND s.is_active = TRUE
),
-- Step 2: Get skills related to installed skills
installed_skill_matches AS (
  SELECT DISTINCT s2.id, s2.skill_id, s2.title, s2.installs
  FROM skills s1
  JOIN package_skill_mappings psm1 ON s1.id = psm1.skill_id
  JOIN package_skill_mappings psm2 ON psm1.package_id = psm2.package_id
  JOIN skills s2 ON psm2.skill_id = s2.id
  WHERE s1.skill_id = ANY($2)  -- $2 = ['expo-some-skill'] (installed)
    AND s2.id != s1.id
    AND s2.is_active = TRUE
)
-- Combine and rank
SELECT 
  COALESCE(pm.skill_id, ism.skill_id) as skill_id,
  COALESCE(pm.title, ism.title) as title,
  COALESCE(pm.installs, ism.installs) as installs,
  CASE 
    WHEN pm.id IS NOT NULL THEN 'package_json'
    ELSE 'installed_skill'
  END as match_type
FROM package_matches pm
FULL OUTER JOIN installed_skill_matches ism ON pm.id = ism.id
ORDER BY 
  CASE WHEN pm.id IS NOT NULL THEN 0 ELSE 1 END,  -- package.json first
  COALESCE(pm.installs, ism.installs) DESC;        -- then by installs
```

## Tags: Optional Auto-Generated (For Filtering Only)

**Purpose**: Only for filtering/searching in the `review` command (e.g., `upskill review --tag frontend`)

**How to generate**: Auto-infer from skill name/repo/package context (current `inferTags()` function)

**Not used for recommendations**: Recommendations only use package matches and installed skills

**Decision**: 
- Keep tags as auto-generated metadata (no user input)
- Useful for `review` command filtering
- Can be removed if not needed - filtering can work by package/repo/installs instead

## API Endpoints

### Core Endpoint
```
GET /api/v1/skills/suggest
Query params:
  - packages: string[] (from package.json)
  - installed_skills: string[] (already installed skill IDs)
  - limit: number (default: 10)

Response:
{
  "skills": [
    {
      "skill_id": "vercel-react-best-practices",
      "title": "Vercel React Best Practices",
      "repo": "vercel-labs/agent-skills",
      "installs": 25500,
      "packages": ["react", "react-dom", "next"],
      "match_type": "package_json"  // or "installed_skill"
    }
  ],
  "matched_packages": ["react", "next"],
  "matched_installed_skills": []
}
```

## Data Flow

1. **CLI reads package.json** → extracts dependencies
2. **CLI checks installed skills** → reads `.cursor/skills/`, `.agent/skills/`, etc.
3. **CLI calls API** → `GET /api/v1/skills/suggest?packages=react,expo&installed_skills=expo-some-skill`
4. **API queries DB** → matches by packages first, then by installed skills
5. **API ranks by installs** → returns sorted list
6. **CLI displays suggestions** → user selects which to install

## Installation Tracking

The `installs` count in the `skills` table should be:
- **Synced from skills.sh** (periodic scrape/update)
- **NOT incremented by our system** (we don't track user installs)
- **Used purely for ranking** (more installs = more popular = higher rank)

## Migration from Current System

1. **Import existing registry** → Bulk insert into DB
2. **Keep package mappings** → Same inference logic, just store in DB
3. **Update installs** → Periodic sync from skills.sh scraping

## Simplified Tech Stack

- **Database**: PostgreSQL (simple, proven)
- **API**: Hono (Bun) - lightweight
- **Cache**: Redis (optional, for performance)
- **No ML**: Pure rule-based matching
- **No user input**: Everything auto-generated

## What We Removed

- ❌ Confidence scores (not needed for rule-based)
- ❌ User-maintained tags (auto-generate only)
- ❌ ML ranking (use installs count)
- ❌ Analytics tracking (optional, can add later)
- ❌ User preferences (keep it simple)

## What We Keep

- ✅ 3 core tables (packages, skills, mappings)
- ✅ Auto-generated tags (for filtering, optional)
- ✅ Ranking by installs
- ✅ Two-tier matching (package.json → installed skills)
- ✅ Redis caching (performance)
