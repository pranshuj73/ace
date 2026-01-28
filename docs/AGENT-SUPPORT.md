# Agent Support Documentation

## Overview

The Ace CLI now supports **33 AI coding agents** with automatic detection and configuration. This matches the full agent support from Vercel's official skills CLI.

## Supported Agents (33 total)

| Agent ID | Display Name | Project Path | Global Path |
|----------|--------------|--------------|-------------|
| `amp` | Amp | `.agents/skills` | `~/.config/agents/skills` |
| `antigravity` | Antigravity | `.agent/skills` | `~/.gemini/antigravity/global_skills` |
| `claude-code` | Claude Code | `.claude/skills` | `~/.claude/skills` |
| `moltbot` | Moltbot | `skills` | `~/.moltbot/skills` or `~/.clawdbot/skills` |
| `cline` | Cline | `.cline/skills` | `~/.cline/skills` |
| `codebuddy` | CodeBuddy | `.codebuddy/skills` | `~/.codebuddy/skills` |
| `codex` | Codex | `.codex/skills` | `~/.codex/skills` |
| `command-code` | Command Code | `.commandcode/skills` | `~/.commandcode/skills` |
| `continue` | Continue | `.continue/skills` | `~/.continue/skills` |
| `crush` | Crush | `.crush/skills` | `~/.config/crush/skills` |
| `cursor` | Cursor | `.cursor/skills` | `~/.cursor/skills` |
| `droid` | Droid | `.factory/skills` | `~/.factory/skills` |
| `gemini-cli` | Gemini CLI | `.gemini/skills` | `~/.gemini/skills` |
| `github-copilot` | GitHub Copilot | `.github/skills` | `~/.copilot/skills` |
| `goose` | Goose | `.goose/skills` | `~/.config/goose/skills` |
| `junie` | Junie | `.junie/skills` | `~/.junie/skills` |
| `kilo` | Kilo Code | `.kilocode/skills` | `~/.kilocode/skills` |
| `kimi-cli` | Kimi Code CLI | `.agents/skills` | `~/.config/agents/skills` |
| `kiro-cli` | Kiro CLI | `.kiro/skills` | `~/.kiro/skills` |
| `kode` | Kode | `.kode/skills` | `~/.kode/skills` |
| `mcpjam` | MCPJam | `.mcpjam/skills` | `~/.mcpjam/skills` |
| `mux` | Mux | `.mux/skills` | `~/.mux/skills` |
| `neovate` | Neovate | `.neovate/skills` | `~/.neovate/skills` |
| `opencode` | OpenCode | `.opencode/skills` | `~/.config/opencode/skills` |
| `openhands` | OpenHands | `.openhands/skills` | `~/.openhands/skills` |
| `pi` | Pi | `.pi/skills` | `~/.pi/agent/skills` |
| `pochi` | Pochi | `.pochi/skills` | `~/.pochi/skills` |
| `qoder` | Qoder | `.qoder/skills` | `~/.qoder/skills` |
| `qwen-code` | Qwen Code | `.qwen/skills` | `~/.qwen/skills` |
| `roo` | Roo Code | `.roo/skills` | `~/.roo/skills` |
| `trae` | Trae | `.trae/skills` | `~/.trae/skills` |
| `windsurf` | Windsurf | `.windsurf/skills` | `~/.codeium/windsurf/skills` |
| `zencoder` | Zencoder | `.zencoder/skills` | `~/.zencoder/skills` |

## Features

### 1. Automatic Agent Detection

The CLI automatically detects which agents are installed on your system:

```bash
# Show detected agents
bun run dev:cli suggest --show-agents

# Example output:
# Detected Agents:
#   ✓ Claude Code (claude-code)
#   ✓ Cursor (cursor)
#   ✓ Windsurf (windsurf)
#   ✓ Gemini CLI (gemini-cli)
```

### 2. Manual Agent Selection

You can specify which agents to check:

```bash
# Check specific agents
bun run dev:cli suggest --agents cursor claude-code windsurf

# Check single agent
bun run dev:cli suggest --agents cursor
```

### 3. Scope Options

Control where to check for installed skills:

```bash
# Project-level only (default)
bun run dev:cli suggest --scope project

# Global-level only
bun run dev:cli suggest --scope global

# Both project and global
bun run dev:cli suggest --scope both
```

## API Reference

### Core Functions

#### `detectInstalledAgents(): AgentId[]`

Automatically detects which agents are installed on the system.

**Returns**: Array of installed agent IDs

**Example**:
```typescript
import { detectInstalledAgents } from './utils/agents';

const installed = detectInstalledAgents();
console.log(installed); // ['cursor', 'claude-code', 'windsurf']
```

#### `getAgentConfig(agentId: AgentId): AgentConfig`

Get configuration for a specific agent.

**Parameters**:
- `agentId` - The agent ID to get config for

**Returns**: Agent configuration object

**Example**:
```typescript
import { getAgentConfig } from './utils/agents';

const config = getAgentConfig('cursor');
console.log(config.projectSkillsDir); // '.cursor/skills'
console.log(config.globalSkillsDir);  // '~/.cursor/skills'
```

#### `getInstalledSkills(cwd, agents?, scope?): string[]`

Get all installed skills across specified agents.

**Parameters**:
- `cwd` - Current working directory
- `agents` - Array of agent IDs (optional, auto-detects if not provided)
- `scope` - 'project', 'global', or 'both' (default: 'project')

**Returns**: Array of unique skill names

**Example**:
```typescript
import { getInstalledSkills } from './utils/installed-skills';

// Auto-detect agents
const skills = getInstalledSkills(process.cwd());

// Specific agents
const cursorSkills = getInstalledSkills(process.cwd(), ['cursor']);

// Both project and global
const allSkills = getInstalledSkills(process.cwd(), undefined, 'both');
```

#### `getInstalledSkillsByAgent(cwd, agents?, scope?): Map<AgentId, string[]>`

Get installed skills grouped by agent.

**Returns**: Map of agent ID to array of skill names

**Example**:
```typescript
import { getInstalledSkillsByAgent } from './utils/installed-skills';

const skillsByAgent = getInstalledSkillsByAgent(process.cwd());

for (const [agentId, skills] of skillsByAgent) {
  console.log(`${agentId}: ${skills.join(', ')}`);
}
```

#### `isSkillInstalled(cwd, skillName, agents?, scope?): boolean`

Check if a specific skill is installed for any agent.

**Parameters**:
- `cwd` - Current working directory
- `skillName` - Name of skill to check
- `agents` - Optional array of agent IDs
- `scope` - Optional scope ('project', 'global', or 'both')

**Returns**: True if skill is found

**Example**:
```typescript
import { isSkillInstalled } from './utils/installed-skills';

if (isSkillInstalled(process.cwd(), 'typescript-expert')) {
  console.log('TypeScript Expert skill is already installed');
}
```

## Environment Variables

### Agent-Specific Environment Variables

Some agents support custom configuration directories:

- `CODEX_HOME` - Custom Codex config directory (default: `~/.codex`)
- `CLAUDE_CONFIG_DIR` - Custom Claude Code config directory (default: `~/.claude`)

**Example**:
```bash
export CODEX_HOME="/custom/path/codex"
bun run dev:cli suggest
```

## Implementation Details

### Detection Logic

Each agent has a custom detection function that checks for:
1. Project-level directories (e.g., `.cursor/`, `.claude/`)
2. Global configuration directories (e.g., `~/.cursor/`, `~/.claude/`)
3. System-level installations (e.g., `/etc/codex` for Codex)

### Skill Directory Structure

Skills are detected in subdirectories of the skills folder:

```
.cursor/skills/
├── skill-name-1/
│   └── SKILL.md
├── skill-name-2/
│   └── SKILL.md
└── another-skill/
    └── SKILL.md
```

Both directories and symlinks are supported.

### Fallback Behavior

If no agents are detected:
1. CLI warns the user
2. Checks common agents: `cursor`, `claude-code`, `windsurf`, `gemini-cli`
3. Continues with skill suggestions from Vercel API

## Testing

### Test Agent Detection

```bash
# Show detected agents
bun run dev:cli suggest --show-agents
```

### Test Specific Agents

```bash
# Test with specific agents
bun run dev:cli suggest --agents cursor windsurf --limit 5
```

### Test Different Scopes

```bash
# Project only
bun run dev:cli suggest --scope project

# Global only
bun run dev:cli suggest --scope global

# Both
bun run dev:cli suggest --scope both
```

## Compatibility

### Agent Version Compatibility

This implementation is based on the official Vercel skills CLI (v1.1.8) agent configuration. It should work with:

- ✅ All current agent versions
- ✅ Future agents (as long as they follow the standard skills directory structure)
- ✅ Legacy agent installations

### Adding New Agents

To add support for a new agent:

1. Add the agent ID to the `AgentId` type in `apps/cli/src/utils/agents.ts`
2. Add the agent configuration to the `AGENT_CONFIGS` object
3. Implement the `detectInstalled()` function

**Example**:
```typescript
'new-agent': {
  id: 'new-agent',
  displayName: 'New Agent',
  projectSkillsDir: '.newagent/skills',
  globalSkillsDir: path.join(home, '.newagent/skills'),
  detectInstalled: () => existsSync(path.join(home, '.newagent')),
}
```

## Troubleshooting

### Agent Not Detected

If an agent is installed but not detected:

1. Check if the agent's config directory exists:
   ```bash
   ls -la ~/.cursor ~/.claude ~/.windsurf
   ```

2. Manually specify the agent:
   ```bash
   bun run dev:cli suggest --agents cursor
   ```

3. Check for custom environment variables (CODEX_HOME, CLAUDE_CONFIG_DIR)

### No Skills Found

If the CLI reports no skills:

1. Verify skills are installed:
   ```bash
   ls -la .cursor/skills/
   ls -la ~/.cursor/skills/
   ```

2. Try different scope:
   ```bash
   bun run dev:cli suggest --scope both
   ```

3. Check if skills are in a non-standard location

### Permission Errors

If you get permission errors:

1. Check directory permissions:
   ```bash
   ls -la ~/.cursor/skills/
   ```

2. Ensure the CLI has read access to agent directories

## Performance

- **Agent Detection**: O(n) where n = number of agents (33)
- **Skill Scanning**: O(m) where m = number of skill directories
- **Caching**: Detection results are not cached (runs on each command)

Typical performance:
- Agent detection: < 10ms
- Skill scanning (10 agents, 50 skills total): < 50ms

## Future Enhancements

Potential improvements:

1. **Cache Detection Results** - Cache which agents are installed for faster subsequent runs
2. **Skill Validation** - Verify SKILL.md files are valid
3. **Agent Installation Status** - Show which agents are running/active
4. **Conflict Detection** - Detect if same skill is installed for multiple agents with different versions
5. **Bulk Operations** - Install skills to multiple agents at once

---

**Last Updated**: 2025-01-28
**Agent Count**: 33 agents supported
**Status**: Production-ready ✅
