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

### `ace` ✨ (Main Command)

Interactive skill discovery and installation with beautiful TUI. Aligned with Vercel CLI experience.

**First Run:**
- Asks installation preference (project or global) FIRST
- Auto-detects installed agents based on scope
- Shows only detected agents or popular 6 agents
- Saves config to `agents.json` for future runs

**How it works:**
1. Shows intro and starts analyzing project (parallel with config setup)
2. Reads `package.json` to extract dependencies
3. Scans for installed skills in configured agent directories
4. Searches Vercel's API for relevant skills
5. Shows interactive multi-select to choose suggested skills
6. Asks if you want to search for more skills
7. If yes, lets you search and select additional skills
8. Shows total count and asks for confirmation: "Selected X skills to install. Proceed?"
9. Installs all selected skills to `.agents/skills/` with symlinks

**Options:**
- `--limit <number>` - Max suggestions to show (default: 10)

**Example:**
```bash
# Just run ace
bun run dev:cli

# Or with custom limit
bun run dev:cli --limit 20
```

### `ace config`

Reset your configuration (deletes `agents.json`). Next run will ask for preferences again.

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
- `apps/cli/src/utils/flow.ts` - Main flow orchestration (suggestions + search + install)
- `apps/cli/src/utils/suggest.ts` - Suggestion generation logic
- `apps/cli/src/utils/vercel-api.ts` - Vercel API client
- `apps/cli/src/utils/config.ts` - Configuration management and first-run setup
- `apps/cli/src/utils/install.ts` - Skill installation with git clone

**Utilities:**
- `apps/cli/src/utils/package-json.ts` - Read package.json dependencies
- `apps/cli/src/utils/installed-skills.ts` - Detect installed skills
- `apps/cli/src/utils/detect-agents.ts` - Auto-detect installed agents
- `apps/cli/src/utils/agents.ts` - Agent configuration (33 agents)
- `apps/cli/src/utils/api.ts` - Our own API client (optional)

### Data Flow

```
User runs: ace
  ↓
Show ASCII art + intro
  ↓
┌─────────────────────────────┬─────────────────────────────┐
│ Config Setup                │ Package Analysis            │
│ (if first run: ask prefs)   │ (read package.json)         │
└─────────────────────────────┴─────────────────────────────┘
  ↓
Sync installed skills with config
  ↓
Search Vercel API in parallel for each package
  ↓
Aggregate & rank results by relevance
  ↓
Display suggestions (multi-select)
  ↓
Ask: "Install more skills?"
  ↓
[If yes] Search loop:
  - User enters search query
  - Search Vercel API
  - Show results (multi-select)
  - Ask if user wants to search again
  ↓
Show confirmation: "Selected X skills. Proceed?"
  ↓
Install all selected skills to .agents/skills/
  ↓
Update agents.json with installed skills
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
