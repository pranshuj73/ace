# Vercel Skills CLI - Architecture Reference

> **Note**: This document captures the architecture of Vercel's official `skills` CLI (as of version 1.1.8) for reference purposes. Our implementation uses their public API but does not copy their code.

## Overview

Vercel's `skills` CLI is the official tool for managing agent skills across 30+ coding agents. It handles installation, updates, search, and discovery of skills from the skills.sh ecosystem.

**Repository**: https://github.com/vercel-labs/skills
**Package**: `npx skills`
**Version**: 1.1.8

## Public API Endpoints

These are the public APIs we can use without any authentication:

### 1. Search API
```
GET https://skills.sh/api/search?q={query}&limit={number}
```

**Request:**
- `q` - Search query (skill name, keyword, package name)
- `limit` - Max results (default: 10)

**Response:**
```typescript
{
  skills: Array<{
    id: string;           // Skill slug/ID
    name: string;         // Display name
    installs: number;     // Installation count
    topSource: string | null;  // GitHub repo (e.g., "vercel-labs/agent-skills")
  }>;
}
```

**Example:**
```bash
curl "https://skills.sh/api/search?q=typescript&limit=10"
```

### 2. Fuzzy Match API (Skill Lookup)
```
POST https://skills.sh/api/skills/search
```

**Request:**
```typescript
{
  skills: string[];  // Array of skill names to match
}
```

**Response:**
```typescript
{
  matches: Record<string, MatchResult | null>;
}

interface MatchResult {
  source: string;      // GitHub repo (e.g., "vercel-labs/agent-skills")
  skillId: string;     // Skill slug
  name: string;        // Skill name
  installs: number;    // Installation count
  score: number;       // Match confidence (1000 = exact match)
  sourceUrl?: string;  // Optional URL to skill
}
```

**Purpose**: Used to match installed skill names to their original sources (for updates, lock file generation).

**Example:**
```bash
curl -X POST https://skills.sh/api/skills/search \
  -H "Content-Type: application/json" \
  -d '{"skills": ["typescript-advanced-types", "pr-review"]}'
```

### 3. Check Updates API
```
POST https://add-skill.vercel.sh/check-updates
```

**Request:**
```typescript
{
  skills: Array<{
    name: string;
    source: string;          // GitHub repo
    path?: string;           // Path within repo
    skillFolderHash: string; // Git tree SHA
  }>;
}
```

**Response:**
```typescript
{
  updates: Array<{
    name: string;
    source: string;
    currentHash: string;
    latestHash: string;
  }>;
  errors?: Array<{
    name: string;
    source: string;
    error: string;
  }>;
}
```

**Purpose**: Checks if installed skills have updates available by comparing git tree hashes.

## Key Architecture Patterns

### 1. Multi-Provider System

Vercel's CLI supports multiple skill hosting providers:

```typescript
interface HostProvider {
  id: string;
  displayName: string;
  match(url: string): ProviderMatch;
  fetchSkill(url: string): Promise<RemoteSkill | null>;
  toRawUrl(url: string): string;
  getSourceIdentifier(url: string): string;
}
```

**Built-in Providers:**
- **GitHub** - Default, handles owner/repo URLs
- **Mintlify** - Handles mintlify.com docs sites
- **HuggingFace** - Handles huggingface.co spaces
- **WellKnown** - Handles `.well-known/skills` endpoints

### 2. Skill Lock File

**Location**: `~/.agents/.skill-lock.json`

**Purpose**: Tracks installed skills for update checking

**Structure:**
```typescript
{
  version: 3,
  skills: {
    "skill-name": {
      source: "vercel-labs/agent-skills",
      sourceType: "github" | "mintlify" | "huggingface",
      sourceUrl: "https://github.com/vercel-labs/agent-skills.git",
      skillPath?: "skills/frontend-design",
      skillFolderHash: "abc123...",  // Git tree SHA
      installedAt: "2025-01-28T...",
      updatedAt: "2025-01-28T..."
    }
  }
}
```

**Version History:**
- v1: Basic tracking
- v2: Added sourceType
- v3: Added skillFolderHash for folder-level update detection

### 3. Agent Configuration

**Supported Agents (30+):**
```typescript
const AGENTS = [
  { id: "cursor", projectPath: ".cursor/skills/", globalPath: "~/.cursor/skills/" },
  { id: "claude-code", projectPath: ".claude/skills/", globalPath: "~/.claude/skills/" },
  { id: "windsurf", projectPath: ".windsurf/skills/", globalPath: "~/.codeium/windsurf/skills/" },
  { id: "gemini-cli", projectPath: ".gemini/skills/", globalPath: "~/.gemini/skills/" },
  // ... 26 more agents
];
```

**Installation Scopes:**
- **Project**: `./<agent>/skills/` (committed with repo)
- **Global**: `~/<agent>/skills/` (user-level, cross-project)

### 4. Skill Discovery Paths

When scanning a repo for skills, Vercel's CLI searches in this order:

```typescript
const DISCOVERY_PATHS = [
  "",                      // Root (if SKILL.md exists)
  "skills/",
  "skills/.curated/",
  "skills/.experimental/",
  "skills/.system/",
  ".agents/skills/",
  ".agent/skills/",
  ".claude/skills/",
  // ... all agent paths
];
```

**Skill File**: `SKILL.md` with YAML frontmatter

**Required Fields:**
```yaml
---
name: skill-name
description: What this skill does
---

# Skill instructions here
```

**Optional Fields:**
```yaml
---
name: skill-name
description: What this skill does
metadata:
  internal: true  # Hide from public discovery
---
```

## CLI Commands Reference

### Add Command
```bash
npx skills add <source> [options]
```

**Options:**
- `-g, --global` - Install globally (user-level)
- `-a, --agent <agents>` - Target specific agents
- `-s, --skill <skills>` - Install specific skills by name
- `-l, --list` - List available skills without installing
- `-y, --yes` - Skip confirmation prompts
- `--all` - Install all skills to all agents

**Source Formats:**
- `owner/repo` - GitHub shorthand
- `https://github.com/owner/repo` - Full GitHub URL
- `https://github.com/owner/repo/tree/main/skills/name` - Specific skill
- `git@github.com:owner/repo.git` - SSH URL
- `./local/path` - Local directory

**Installation Methods:**
1. **Symlink** (recommended) - Single canonical copy, symlinked to agents
2. **Copy** - Independent copies for each agent

### Find Command
```bash
npx skills find [query]
```

**Interactive Mode** (no query):
- fzf-style search interface
- Debounced API calls
- Real-time results
- Keyboard navigation (up/down/enter/esc)

**Non-Interactive Mode** (with query):
- Direct API search
- Prints results to stdout

**Uses**: Search API (`https://skills.sh/api/search`)

### List Command
```bash
npx skills list [options]
```

**Options:**
- `-g, --global` - List global skills only
- `-a, --agent <agents>` - Filter by specific agents

**Output**: Lists all installed skills with their locations

### Check Command
```bash
npx skills check
```

**Flow:**
1. Read `.skill-lock.json`
2. POST to check-updates API with skill hashes
3. Display available updates
4. Prompt user to run `npx skills update`

### Update Command
```bash
npx skills update
```

**Flow:**
1. Check for updates (same as check command)
2. For each skill with updates:
   - Re-run `npx skills add <source> --skill <name> -g -y`
   - Update lock file with new hash

### Generate Lock Command
```bash
npx skills generate-lock [--dry-run]
```

**Flow:**
1. Scan `~/.agents/skills/` for installed skills
2. POST skill names to fuzzy match API
3. Match skills to their sources (score >= 1000 = exact)
4. Generate/update `.skill-lock.json`
5. Skip skills with no exact match

**Purpose**: Enables update tracking for skills installed manually

### Init Command
```bash
npx skills init [name]
```

**Creates**: `SKILL.md` template with YAML frontmatter

## Telemetry

**Disabled by default in CI environments**

**Environment Variables:**
- `DISABLE_TELEMETRY=1` - Disable telemetry
- `DO_NOT_TRACK=1` - Alternative disable flag
- `INSTALL_INTERNAL_SKILLS=1` - Show skills marked as internal

**Tracked Events:**
- `find` - Search queries
- `check` - Update checks
- `update` - Skill updates
- (Installation events likely tracked but not visible in code)

**Endpoint**: Not disclosed in public code

## Git Operations

Vercel's CLI uses `simple-git` for:
- Cloning repositories
- Checking out specific branches/commits
- Computing folder hashes (git tree SHA)
- Sparse checkout for efficiency

**Hash Calculation** (for updates):
```bash
git ls-tree HEAD:<path> | shasum
```

This generates a hash of the entire skill folder, enabling folder-level update detection.

## Error Handling

**Common Patterns:**
1. Graceful API fallbacks (returns empty array on error)
2. Detailed error messages with context
3. Non-zero exit codes for failures
4. Retry logic not implemented (single attempt per operation)

## Rate Limiting

**Client-Side:**
- No explicit rate limiting in code
- Uses batching for multiple searches (batch size: 5)
- 100ms delay between batches

**Server-Side:**
- Not documented publicly
- Appears to be permissive for reasonable usage

## Data Structures

### SKILL.md Parsing
```typescript
import matter from 'gray-matter';

const { data, content } = matter(skillFile);
// data = frontmatter (name, description, metadata)
// content = markdown body
```

### Skill Installation
```typescript
interface InstallOptions {
  global: boolean;
  agents: AgentId[];
  skillNames: string[];
  installMethod: 'symlink' | 'copy';
  skipPrompts: boolean;
}
```

## Differences from Our Implementation

| Feature | Vercel CLI | Our CLI |
|---------|-----------|---------|
| **Primary Function** | Install & manage skills | Discover & suggest skills |
| **Data Source** | Git repos + API | Vercel API only |
| **Installation** | Full installer with symlinks | Suggests install commands |
| **Updates** | Built-in update checker | Not implemented |
| **Lock File** | Maintains `.skill-lock.json` | Not needed |
| **Git Operations** | Clones repos, manages files | None (API-only) |
| **Intelligence** | Basic search | Smart package mapping + ranking |
| **Focus** | Skill management | Skill discovery |

## What We Can Reuse

✅ **Already Using:**
- Search API (`/api/search`)
- Fuzzy match API (`/api/skills/search`)
- API response types

❌ **Not Needed:**
- Git operations (we don't clone repos)
- Lock file management (we don't track installations)
- Installation logic (we suggest commands, user installs)
- Update checking (not our responsibility)
- Provider system (we only use public API)

## Key Takeaways

1. **API is Public & Stable** - We can rely on it
2. **No Authentication Required** - Easy to integrate
3. **Rate Limiting is Reasonable** - Batch requests, add delays
4. **Search is Keyword-Based** - Good for package name matching
5. **Update System is Git-Hash Based** - Clever but we don't need it

## Safe to Delete

The `skills-main` directory can be safely deleted because:
- ✅ We've documented all public APIs
- ✅ We've extracted the endpoint URLs
- ✅ We've captured the data structures
- ✅ Our implementation doesn't depend on their code
- ✅ We can always reference the GitHub repo if needed

**Before Deleting:**
1. ✅ Document complete
2. ✅ Our CLI working with their API
3. ✅ No imports from `skills-main/` in our code

## Additional Resources

- **Official Repo**: https://github.com/vercel-labs/skills
- **Skills Directory**: https://skills.sh
- **Agent Skills Spec**: https://agentskills.io
- **Our Implementation**: See `apps/cli/src/utils/vercel-api.ts`

---

**Last Updated**: 2025-01-28
**Vercel CLI Version**: 1.1.8
**Status**: Complete documentation, safe to delete their code
