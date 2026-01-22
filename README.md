# Upskill Monorepo

Open-source skills ecosystem for AI agents - API server and CLI.

## Structure

```
upskill/
├── apps/
│   ├── api/          # Elysia API server
│   └── cli/          # CLI tool
├── docs/             # Architecture documentation
└── scraped.json      # Scraped skills data
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
- `GET /api/v1/stats` - Registry statistics (coming soon)

## CLI Commands

- `upskill suggest` - Suggest skills based on package.json
- `upskill review` - Review mapped skills

## Environment Variables

- `UPSKILL_API_URL` - API base URL (default: http://localhost:3000)
