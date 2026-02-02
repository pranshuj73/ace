# @prnsh/ace

> Hybrid AI agent skill discovery CLI - intelligently suggests skills based on your tech stack

Ace is a smart CLI tool that analyzes your project's dependencies and suggests relevant AI agent skills from [Vercel's skills.sh](https://skills.sh). It supports 33+ AI coding agents including Cursor, Claude Code, Windsurf, Cline, and more.

## Features

- 🔍 **Smart Discovery** - Analyzes your package.json to suggest relevant skills
- 🤖 **Multi-Agent Support** - Works with 33+ AI coding agents
- 🔄 **Real-time Data** - Powered by Vercel's skills.sh API
- 📦 **Easy Installation** - Install skills directly from the CLI
- 🎯 **Intelligent Ranking** - Skills ranked by relevance and popularity
- 🔎 **Search & Browse** - Search for additional skills interactively

## Installation

### Quick Start (no installation)

```bash
# With npm
npx @prnsh/ace

# With Bun
bunx @prnsh/ace
```

### Global Installation

```bash
# With npm
npm install -g @prnsh/ace

# With Bun
bun install -g @prnsh/ace

# Then run
ace
```

## Usage

### Main Command

```bash
ace
```

This will:
1. Analyze your package.json dependencies
2. Detect installed skills
3. Suggest relevant skills
4. Let you search for more skills
5. Install selected skills

### Options

```bash
ace --limit 20        # Show up to 20 suggestions (default: 10)
ace --help            # Show help
ace --version         # Show version
```

### Reset Configuration

```bash
ace config
```

## Supported AI Agents

Ace supports 33 AI coding agents including:

- Amp, Antigravity, Claude Code, Moltbot, Cline, CodeBuddy, Codex, Command Code
- Continue, Crush, Cursor, Droid, Gemini CLI, GitHub Copilot, Goose, Junie
- Kilo, Kimi CLI, Kiro CLI, Kode, MCPJam, Mux, Neovate, OpenCode
- OpenHands, Pi, Pochi, Qoder, Qwen Code, Roo Code, Trae, Windsurf, Zencoder

## How It Works

1. **Package Analysis** - Reads your package.json to understand your tech stack
2. **Skill Detection** - Scans for already installed skills
3. **Smart Suggestions** - Queries Vercel's API for relevant skills
4. **Interactive Selection** - Beautiful TUI for choosing skills
5. **One-Click Install** - Installs skills to `.agents/skills/` with automatic symlinks

## Requirements

- Node.js >= 18.0.0
- A project with package.json (recommended)

## Examples

```bash
# Run in a React project
cd my-react-app
npx @prnsh/ace

# Show more suggestions
npx @prnsh/ace --limit 25

# Reset preferences
npx @prnsh/ace config
```

## Links

- [GitHub Repository](https://github.com/prnsh/ace)
- [Vercel Skills Registry](https://skills.sh)
- [Report Issues](https://github.com/prnsh/ace/issues)

## License

MIT
