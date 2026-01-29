# Ace Monorepo

Open-source skills ecosystem for AI agents - API server and CLI.

## Structure

```
ace/
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

### `ace` (Main Command)

Intelligently discovers and installs skills for your project.

```bash
# Basic usage
bun run dev:cli

# With options
bun run dev:cli --limit 20
```

**Flow**:
1. First run: asks for agent preferences and scope (project/global)
2. Analyzes your `package.json` and suggests relevant skills
3. Shows interactive multi-select to choose skills
4. Optionally search for additional skills
5. Confirms total selection before installation
6. Installs all selected skills to `.agents/skills/`

**Features**:
- ✅ Reads `package.json` dependencies
- ✅ Detects installed skills across 33 agents
- ✅ Auto-detects which agents are installed
- ✅ Interactive search for additional skills
- ✅ Searches Vercel's skills.sh API
- ✅ Smart relevance ranking
- ✅ Batch installation with confirmation
- ✅ Beautiful terminal UI with @clack/prompts

### `ace config`

Reset your configuration (deletes `agents.json`). Next run will ask for preferences again.

```bash
bun run dev:cli config
```

## Environment Variables

- `ACE_API_URL` - API base URL (default: http://localhost:3000)
