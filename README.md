# Upskill Monorepo

Open-source skills ecosystem for AI agents - API server and CLI.

## Structure

```
upskill/
├── apps/
│   ├── api/          # Elysia API server (optional, for future enhancements)
│   └── cli/          # Main CLI tool ✨
├── docs/             # Architecture documentation
│   ├── AGENT-SUPPORT.md      # 33 supported agents
│   ├── VERCEL-CLI-REFERENCE.md  # Vercel API reference
│   └── ...
└── skills-main/      # Vercel CLI reference (can be deleted)
```

## Setup

### Install dependencies

```bash
bun install
```

### Development

**From root (recommended):**
```bash
# Run API server
bun run dev:api
# Server runs on http://localhost:3000

# Run CLI
bun run dev:cli

# Run both (if needed)
bun run dev
```

**Or from individual apps:**
```bash
# API Server
cd apps/api && bun run dev

# CLI
cd apps/cli && bun run dev
```

## Building

```bash
# Build all apps
bun run build

# Build specific app
bun run build:api
bun run build:cli
```

## Scripts Reference

- `bun run dev:api` - Start API server in dev mode
- `bun run dev:cli` - Run CLI in dev mode
- `bun run build:api` - Build API server
- `bun run build:cli` - Build CLI
- `bun run start:api` - Start built API server
- `bun run typecheck` - Type check all apps
- `bun run typecheck:api` - Type check API only
- `bun run typecheck:cli` - Type check CLI only

## API Endpoints

- `GET /` - API info
- `GET /health` - Health check
- `GET /api/v1/skills/suggest` - Suggest skills (coming soon)
- `GET /api/v1/skills/:skillId` - Get skill details (coming soon)
- `GET /api/v1/packages/:packageName/skills` - Get skills for package (coming soon)

## CLI Commands

### `upskill suggest` (Main Feature)

Intelligently suggests skills based on your project's dependencies and installed skills.

```bash
# Basic usage (auto-detects installed agents)
bun run dev:cli suggest

# With options
bun run dev:cli suggest --limit 20 --scope both

# Show detected agents
bun run dev:cli suggest --show-agents

# Specify agents manually
bun run dev:cli suggest --agents cursor claude-code windsurf
```

**Features**:
- ✅ Reads `package.json` dependencies
- ✅ Detects installed skills across 33 agents
- ✅ Auto-detects which agents are installed
- ✅ Searches Vercel's skills.sh API
- ✅ Smart relevance ranking
- ✅ Beautiful terminal output

### Other Commands (Coming Soon)

- `upskill review` - Review skills in registry
- `upskill discover` - Auto-discover missing skills

## Environment Variables

- `UPSKILL_API_URL` - API base URL (default: http://localhost:3000)
