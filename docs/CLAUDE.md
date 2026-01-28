# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ace is an open-source skills ecosystem for AI agents with an API server and CLI. The project suggests relevant AI agent skills based on installed packages and existing skills.

## Monorepo Structure

```
ace/
├── apps/
│   ├── api/          # Elysia API server (Bun/Cloudflare Workers)
│   └── cli/          # CLI tool for suggesting skills
├── docs/             # Architecture and recommendation logic docs
└── scraped.json      # Scraped skills data
```

## Development Commands

### From Root (Recommended)
```bash
# Install dependencies
bun install

# Run API server (http://localhost:3000)
bun run dev:api

# Run CLI
bun run dev:cli

# Build all apps
bun run build

# Type check
bun run typecheck
```

### Individual Apps
```bash
# API Server
cd apps/api && bun run dev

# CLI
cd apps/cli && bun run dev
```

### API-Specific Commands
```bash
# Build/deploy for Cloudflare Workers
bun run build:cloudflare
bun run deploy

# Run Cloudflare Workers dev server (http://localhost:8787)
bun run dev:cloudflare
```

## Tech Stack

- **Runtime**: Bun (primary), Node.js (compatible)
- **API Framework**: Elysia (supports both Bun and Cloudflare Workers)
- **Database**: Turso (libSQL/SQLite)
- **ORM**: Drizzle ORM
- **CLI**: yargs

## Database Architecture

### Schema (`apps/api/src/db/schema.ts`)

Three main tables:
1. **skills** - Individual agent skills with metadata
   - `id`, `name`, `title`, `description`, `repo`, `installs`, timestamps
2. **packages** - npm packages (e.g., "react", "next")
   - `id`, `name`, timestamps
3. **package_skill_asscn** - Many-to-many association
   - `packageId`, `skillId`, timestamps

### Database Setup

The database uses Turso (libSQL). Configuration is in `drizzle.config.ts` at the root.

**Environment Variables:**
- `DATABASE_URL` - Turso database URL
- `DATABASE_API_TOKEN` - Turso auth token

**Local Development (Node/Bun):**
Create `.env` file at root with:
```
DATABASE_URL=your-turso-database-url
DATABASE_API_TOKEN=your-turso-api-token
```

**Cloudflare Workers Development:**
Create `apps/api/.dev.vars` (gitignored) with same variables.

**Cloudflare Workers Production:**
Set secrets via Wrangler:
```bash
wrangler secret put DATABASE_URL
wrangler secret put DATABASE_API_TOKEN
```

### Database Migrations

Drizzle Kit is used for migrations:
```bash
# Generate migration
bunx drizzle-kit generate

# Push schema changes
bunx drizzle-kit push

# Open studio to inspect DB
bunx drizzle-kit studio
```

## API Architecture

The API has **dual entry points** to support both Bun/Node.js and Cloudflare Workers:

1. **`apps/api/src/index.ts`** - Bun/Node.js entry point
   - Loads dotenv from `.env`
   - Starts HTTP server on port 3000
   - Auto-initializes DB connection

2. **`apps/api/src/cloudflare.ts`** - Cloudflare Workers entry point
   - Uses Elysia CloudflareAdapter
   - Gets env vars from Cloudflare Workers bindings
   - Explicitly calls `initDb()` with Cloudflare env

### DB Connection Pattern

The DB module (`apps/api/src/db/index.ts`) uses a lazy-initialized Proxy pattern:
- **Node/Bun**: Auto-initializes on first access
- **Cloudflare**: Must call `initDb(env)` explicitly before use
- Environment detection: `typeof process !== "undefined" && process.env`

### Route Organization

Routes are organized in `apps/api/src/routes/`:
- `root/` - API info endpoint
- `health/` - Health check
- `skills/` - Skill suggestion and lookup
- `packages/` - Package-related endpoints

## Recommendation Logic

### Two-Tier Matching System

**Tier 1: Package.json Matches (Highest Priority)**
- Match skills where `targetPackages` intersect with dependencies in user's `package.json`
- Ranked by `installs` count (popularity)

**Tier 2: Installed Skills Matches (Secondary)**
- Find packages associated with installed skills
- Suggest other skills that share those packages
- Excludes already installed skills
- Also ranked by `installs` count

See `docs/recommendation-logic.md` for detailed SQL query logic.

### Implementation

The CLI:
1. Reads `package.json` to extract dependencies
2. Scans for installed skills in `.cursor/skills/`, `.gemini/skills/`, etc.
3. Calls API: `POST /api/v1/skills/suggest` with packages and installed skills
4. API returns suggestions with `match_type` indicator

## Key API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `POST /api/v1/skills/suggest` - Suggest skills (body: `{packages: string[], installed_skills: string[], limit: number}`)
- `GET /api/v1/skills/suggest` - Suggest skills (query params for backward compatibility)
- `GET /api/v1/skills/:skillId` - Get skill by ID or name

## CLI Architecture

The CLI (`apps/cli/src/index.ts`) uses yargs for command parsing:

**Commands:**
- `ace suggest` - Suggest skills based on package.json and installed skills
  - Options: `--agents`, `--scope`, `--limit`
- `ace review` - Review mapped skills (coming soon)

**Utilities:**
- `utils/package-json.ts` - Read package.json dependencies
- `utils/installed-skills.ts` - Detect installed skills from agent directories
- `utils/api.ts` - API client
- `utils/display.ts` - Format output

## Testing & Type Checking

```bash
# Type check all apps
bun run typecheck

# Type check specific app
bun run typecheck:api
bun run typecheck:cli
```

## Important Patterns

### Environment Variable Loading

- **Bun/Node.js**: Uses `dotenv` package, loaded at root `.env`
- **Cloudflare Workers**: Uses `.dev.vars` (local) or Wrangler secrets (production)
- Code checks `typeof process !== "undefined"` to detect environment

### Dual Runtime Support

Code is written to support both Bun/Node.js and Cloudflare Workers:
- Avoid Node-specific APIs without feature detection
- Use environment checks before accessing `process.env`
- DB initialization differs between runtimes

### Skill Detection

The CLI looks for skills in these locations:
- **Project-level**: `{cwd}/.{agent}/skills/`
- **Global-level**: `~/.{agent}/skills/`
- Supported agents: `cursor`, `gemini`, `windsurf`, `agent`

## Notes

- The project uses Bun workspaces for monorepo management
- All TypeScript, type checking is mandatory
- API can run locally (Bun) or on Cloudflare Workers (edge deployment)
- Database is shared between local and production via Turso
- No tests are configured yet
