# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ace is a **hybrid AI agent skill discovery CLI** that intelligently suggests skills based on your tech stack. It combines:
- **Vercel's skills.sh API** for real-time skill data
- **Smart package analysis** from package.json
- **Installed skills detection** across multiple agents
- **Intelligent ranking** based on relevance and popularity

## Monorepo Structure

```
ace/
├── apps/
│   ├── api/          # Elysia API server (optional, for future enhancements)
│   └── cli/          # Main CLI tool ✨
├── docs/             # Architecture documentation
├── skills-main/      # Vercel's official skills CLI (for reference)
└── config.ts         # Shared configuration
```

## Development Commands

### From Root (Recommended)
```bash
# Install dependencies
bun install

# Run CLI (main feature)
bun run dev:cli

# Test the suggest command
bun run dev:cli suggest

# Type check
bun run typecheck
```

### CLI-Specific
```bash
cd apps/cli
bun run dev          # Run CLI
bun run build        # Build for production
bun run typecheck    # Type check only
```

## Tech Stack

- **Runtime**: Bun (primary), Node.js (compatible)
- **CLI Framework**: yargs + @clack/prompts (interactive TUI)
- **External API**: Vercel skills.sh API
- **Language**: TypeScript

## CLI Commands

### `ace suggest` ✨ (Main Feature)

Interactive skill discovery and installation with beautiful TUI.

**First Run:**
- Asks which AI agent you use (Cursor, Claude Code, Windsurf, etc.)
- Asks installation preference (project or global)
- Saves config to `.ace.json` for future runs

**How it works:**
1. Reads `package.json` to extract dependencies
2. Scans for installed skills in configured agent directories
3. Searches Vercel's API for relevant skills
4. Shows interactive multi-select to choose which skills to install
5. Installs selected skills with proper agent and scope flags

**Options:**
- `--limit <number>` - Max suggestions to show (default: 10)

**Example:**
```bash
bun run dev:cli suggest
```

### `ace config`

Reset your configuration (deletes `.ace.json`). Next `suggest` run will ask for preferences again.

**Example:**
```bash
bun run dev:cli config
```

## Architecture

### Hybrid API Strategy

The CLI uses a **three-tier approach**:

1. **Vercel API (Primary)**
   - `GET https://skills.sh/api/search?q={query}&limit={n}`
   - `POST https://skills.sh/api/skills/search` (fuzzy matching)
   - No database maintenance required
   - Always up-to-date with skills.sh registry

2. **Own API (Optional Enhancement)**
   - Falls back if Vercel API is unavailable
   - Pre-computed package → skill mappings
   - Can be deployed to Cloudflare Workers

3. **Intelligence Layer (Our Secret Sauce)**
   - Smart relevance scoring
   - Multi-package detection
   - Related skills discovery
   - Deduplication across sources

### Key Files

**CLI Core:**
- `apps/cli/src/index.ts` - Main entry point with yargs commands
- `apps/cli/src/utils/suggest.ts` - Orchestration logic for suggestions
- `apps/cli/src/utils/vercel-api.ts` - Vercel API client
- `apps/cli/src/utils/display.ts` - Pretty terminal output

**Utilities:**
- `apps/cli/src/utils/package-json.ts` - Read package.json dependencies
- `apps/cli/src/utils/installed-skills.ts` - Detect installed skills
- `apps/cli/src/utils/api.ts` - Our own API client (optional)

### Data Flow

```
User runs: ace suggest
  ↓
Read package.json → ["react", "next", "typescript"]
  ↓
Detect installed skills → ["expo-cli"]
  ↓
Search Vercel API in parallel for each package
  ↓
Aggregate & rank results by relevance
  ↓
Display formatted suggestions with install commands
```

### Recommendation Logic

**Tier 1: Package.json Matches (Highest Priority)**
- Direct match: package name → skills
- Relevance score: `log10(installs) * 100 + 1000`
- Multi-package boost: +100 per additional package

**Tier 2: Installed Skills Matches**
- Find source of installed skill
- Search for related skills from same source
- Relevance score: `log10(installs) * 100 + 500`

**Tier 3: General Search**
- Fallback for keyword searches
- Relevance score: `log10(installs) * 100`

### Agent Support

The CLI supports **33 AI coding agents** with automatic detection:

**Auto-Detection**: The CLI automatically detects which agents are installed on your system by checking for their configuration directories.

**Supported Agents** (33 total):
- Amp, Antigravity, Claude Code, Moltbot, Cline, CodeBuddy, Codex, Command Code
- Continue, Crush, Cursor, Droid, Gemini CLI, GitHub Copilot, Goose, Junie
- Kilo, Kimi CLI, Kiro CLI, Kode, MCPJam, Mux, Neovate, OpenCode
- OpenHands, Pi, Pochi, Qoder, Qwen Code, Roo Code, Trae, Windsurf, Zencoder

**Configuration** (per agent):
- Project skills: `.{agent}/skills/` (e.g., `.cursor/skills/`)
- Global skills: `~/.{agent}/skills/` (e.g., `~/.cursor/skills/`)

**Usage**:
```bash
# Auto-detect installed agents
bun run dev:cli suggest

# Show detected agents
bun run dev:cli suggest --show-agents

# Specify agents manually
bun run dev:cli suggest --agents cursor claude-code windsurf

# Check both project and global skills
bun run dev:cli suggest --scope both
```

See `docs/AGENT-SUPPORT.md` for complete documentation.

## API Architecture (Optional)

The API server exists for future enhancements but is **not required** for the CLI to work.

### Dual Entry Points

1. **`apps/api/src/index.ts`** - Bun/Node.js
   - Loads dotenv from `.env`
   - Starts HTTP server on port 3000

2. **`apps/api/src/cloudflare.ts`** - Cloudflare Workers
   - Uses Elysia CloudflareAdapter
   - Gets env from Workers bindings

### Database (Turso/libSQL)

**Environment Variables:**
- `DATABASE_URL` - Turso database URL
- `DATABASE_API_TOKEN` - Turso auth token

**Schema:** See `apps/api/src/db/schema.ts`
- `skills` - Skill metadata
- `packages` - npm packages
- `package_skill_asscn` - Many-to-many mappings

**Migrations:**
```bash
bunx drizzle-kit generate  # Generate migration
bunx drizzle-kit push      # Apply to database
bunx drizzle-kit studio    # Browse database
```

## Testing

```bash
# Type check everything
bun run typecheck

# Test CLI suggest command
bun run dev:cli suggest

# Test with specific options
bun run dev:cli suggest --limit 20 --scope global
```

## Environment Variables

**CLI:**
- `SKILLS_API_URL` - Override Vercel API base (default: https://skills.sh)
- `ACE_API_URL` - Our own API URL (optional)

**API (if running):**
- `DATABASE_URL` - Turso database URL
- `DATABASE_API_TOKEN` - Turso auth token

## Notes

- The project primarily focuses on the **CLI tool**
- Vercel's API handles all skill data (no scraping/maintenance)
- Our value-add is in **intelligent discovery** and **UX**
- The API server is optional for future enhancements
- Built with Bun for speed, but Node.js compatible
