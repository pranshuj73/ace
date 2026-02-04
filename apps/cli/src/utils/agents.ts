import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

export type AgentId =
  | "amp"
  | "antigravity"
  | "claude-code"
  | "moltbot"
  | "cline"
  | "codebuddy"
  | "codex"
  | "command-code"
  | "continue"
  | "crush"
  | "cursor"
  | "droid"
  | "gemini-cli"
  | "github-copilot"
  | "goose"
  | "junie"
  | "kilo"
  | "kimi-cli"
  | "kiro-cli"
  | "kode"
  | "mcpjam"
  | "mux"
  | "neovate"
  | "opencode"
  | "openhands"
  | "pi"
  | "pochi"
  | "qoder"
  | "qwen-code"
  | "roo"
  | "trae"
  | "windsurf"
  | "zencoder";

export interface AgentConfig {
  id: AgentId;
  displayName: string;
  projectSkillsDir: string;
  globalSkillsDir: string;
  detectInstalled: () => boolean;
}

const home = homedir();
const codexHome = process.env.CODEX_HOME?.trim() || path.join(home, ".codex");
const claudeHome =
  process.env.CLAUDE_CONFIG_DIR?.trim() || path.join(home, ".claude");

/**
 * Configuration for all supported agents
 * Paths and detection logic based on official agent implementations
 */
export const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  amp: {
    id: "amp",
    displayName: "Amp",
    projectSkillsDir: ".agents/skills",
    globalSkillsDir: path.join(home, ".config/agents/skills"),
    detectInstalled: () => existsSync(path.join(home, ".config/amp")),
  },
  antigravity: {
    id: "antigravity",
    displayName: "Antigravity",
    projectSkillsDir: ".agent/skills",
    globalSkillsDir: path.join(home, ".gemini/antigravity/global_skills"),
    detectInstalled: () =>
      existsSync(path.join(process.cwd(), ".agent")) ||
      existsSync(path.join(home, ".gemini/antigravity")),
  },
  "claude-code": {
    id: "claude-code",
    displayName: "Claude Code",
    projectSkillsDir: ".claude/skills",
    globalSkillsDir: path.join(claudeHome, "skills"),
    detectInstalled: () => existsSync(claudeHome),
  },
  moltbot: {
    id: "moltbot",
    displayName: "Moltbot",
    projectSkillsDir: "skills",
    globalSkillsDir: existsSync(path.join(home, ".clawdbot"))
      ? path.join(home, ".clawdbot/skills")
      : path.join(home, ".moltbot/skills"),
    detectInstalled: () =>
      existsSync(path.join(home, ".moltbot")) ||
      existsSync(path.join(home, ".clawdbot")),
  },
  cline: {
    id: "cline",
    displayName: "Cline",
    projectSkillsDir: ".cline/skills",
    globalSkillsDir: path.join(home, ".cline/skills"),
    detectInstalled: () => existsSync(path.join(home, ".cline")),
  },
  codebuddy: {
    id: "codebuddy",
    displayName: "CodeBuddy",
    projectSkillsDir: ".codebuddy/skills",
    globalSkillsDir: path.join(home, ".codebuddy/skills"),
    detectInstalled: () =>
      existsSync(path.join(process.cwd(), ".codebuddy")) ||
      existsSync(path.join(home, ".codebuddy")),
  },
  codex: {
    id: "codex",
    displayName: "Codex",
    projectSkillsDir: ".codex/skills",
    globalSkillsDir: path.join(codexHome, "skills"),
    detectInstalled: () =>
      existsSync(codexHome) || existsSync("/etc/codex"),
  },
  "command-code": {
    id: "command-code",
    displayName: "Command Code",
    projectSkillsDir: ".commandcode/skills",
    globalSkillsDir: path.join(home, ".commandcode/skills"),
    detectInstalled: () => existsSync(path.join(home, ".commandcode")),
  },
  continue: {
    id: "continue",
    displayName: "Continue",
    projectSkillsDir: ".continue/skills",
    globalSkillsDir: path.join(home, ".continue/skills"),
    detectInstalled: () =>
      existsSync(path.join(process.cwd(), ".continue")) ||
      existsSync(path.join(home, ".continue")),
  },
  crush: {
    id: "crush",
    displayName: "Crush",
    projectSkillsDir: ".crush/skills",
    globalSkillsDir: path.join(home, ".config/crush/skills"),
    detectInstalled: () => existsSync(path.join(home, ".config/crush")),
  },
  cursor: {
    id: "cursor",
    displayName: "Cursor",
    projectSkillsDir: ".cursor/skills",
    globalSkillsDir: path.join(home, ".cursor/skills"),
    detectInstalled: () => existsSync(path.join(home, ".cursor")),
  },
  droid: {
    id: "droid",
    displayName: "Droid",
    projectSkillsDir: ".factory/skills",
    globalSkillsDir: path.join(home, ".factory/skills"),
    detectInstalled: () => existsSync(path.join(home, ".factory")),
  },
  "gemini-cli": {
    id: "gemini-cli",
    displayName: "Gemini CLI",
    projectSkillsDir: ".gemini/skills",
    globalSkillsDir: path.join(home, ".gemini/skills"),
    detectInstalled: () => existsSync(path.join(home, ".gemini")),
  },
  "github-copilot": {
    id: "github-copilot",
    displayName: "GitHub Copilot",
    projectSkillsDir: ".github/skills",
    globalSkillsDir: path.join(home, ".copilot/skills"),
    detectInstalled: () =>
      existsSync(path.join(process.cwd(), ".github")) ||
      existsSync(path.join(home, ".copilot")),
  },
  goose: {
    id: "goose",
    displayName: "Goose",
    projectSkillsDir: ".goose/skills",
    globalSkillsDir: path.join(home, ".config/goose/skills"),
    detectInstalled: () => existsSync(path.join(home, ".config/goose")),
  },
  junie: {
    id: "junie",
    displayName: "Junie",
    projectSkillsDir: ".junie/skills",
    globalSkillsDir: path.join(home, ".junie/skills"),
    detectInstalled: () => existsSync(path.join(home, ".junie")),
  },
  kilo: {
    id: "kilo",
    displayName: "Kilo Code",
    projectSkillsDir: ".kilocode/skills",
    globalSkillsDir: path.join(home, ".kilocode/skills"),
    detectInstalled: () => existsSync(path.join(home, ".kilocode")),
  },
  "kimi-cli": {
    id: "kimi-cli",
    displayName: "Kimi Code CLI",
    projectSkillsDir: ".agents/skills",
    globalSkillsDir: path.join(home, ".config/agents/skills"),
    detectInstalled: () => existsSync(path.join(home, ".kimi")),
  },
  "kiro-cli": {
    id: "kiro-cli",
    displayName: "Kiro CLI",
    projectSkillsDir: ".kiro/skills",
    globalSkillsDir: path.join(home, ".kiro/skills"),
    detectInstalled: () => existsSync(path.join(home, ".kiro")),
  },
  kode: {
    id: "kode",
    displayName: "Kode",
    projectSkillsDir: ".kode/skills",
    globalSkillsDir: path.join(home, ".kode/skills"),
    detectInstalled: () => existsSync(path.join(home, ".kode")),
  },
  mcpjam: {
    id: "mcpjam",
    displayName: "MCPJam",
    projectSkillsDir: ".mcpjam/skills",
    globalSkillsDir: path.join(home, ".mcpjam/skills"),
    detectInstalled: () => existsSync(path.join(home, ".mcpjam")),
  },
  mux: {
    id: "mux",
    displayName: "Mux",
    projectSkillsDir: ".mux/skills",
    globalSkillsDir: path.join(home, ".mux/skills"),
    detectInstalled: () => existsSync(path.join(home, ".mux")),
  },
  opencode: {
    id: "opencode",
    displayName: "OpenCode",
    projectSkillsDir: ".opencode/skills",
    globalSkillsDir: path.join(home, ".config/opencode/skills"),
    detectInstalled: () =>
      existsSync(path.join(home, ".config/opencode")) ||
      existsSync(path.join(claudeHome, "skills")),
  },
  openhands: {
    id: "openhands",
    displayName: "OpenHands",
    projectSkillsDir: ".openhands/skills",
    globalSkillsDir: path.join(home, ".openhands/skills"),
    detectInstalled: () => existsSync(path.join(home, ".openhands")),
  },
  pi: {
    id: "pi",
    displayName: "Pi",
    projectSkillsDir: ".pi/skills",
    globalSkillsDir: path.join(home, ".pi/agent/skills"),
    detectInstalled: () => existsSync(path.join(home, ".pi/agent")),
  },
  qoder: {
    id: "qoder",
    displayName: "Qoder",
    projectSkillsDir: ".qoder/skills",
    globalSkillsDir: path.join(home, ".qoder/skills"),
    detectInstalled: () => existsSync(path.join(home, ".qoder")),
  },
  "qwen-code": {
    id: "qwen-code",
    displayName: "Qwen Code",
    projectSkillsDir: ".qwen/skills",
    globalSkillsDir: path.join(home, ".qwen/skills"),
    detectInstalled: () => existsSync(path.join(home, ".qwen")),
  },
  roo: {
    id: "roo",
    displayName: "Roo Code",
    projectSkillsDir: ".roo/skills",
    globalSkillsDir: path.join(home, ".roo/skills"),
    detectInstalled: () => existsSync(path.join(home, ".roo")),
  },
  trae: {
    id: "trae",
    displayName: "Trae",
    projectSkillsDir: ".trae/skills",
    globalSkillsDir: path.join(home, ".trae/skills"),
    detectInstalled: () => existsSync(path.join(home, ".trae")),
  },
  windsurf: {
    id: "windsurf",
    displayName: "Windsurf",
    projectSkillsDir: ".windsurf/skills",
    globalSkillsDir: path.join(home, ".codeium/windsurf/skills"),
    detectInstalled: () => existsSync(path.join(home, ".codeium/windsurf")),
  },
  zencoder: {
    id: "zencoder",
    displayName: "Zencoder",
    projectSkillsDir: ".zencoder/skills",
    globalSkillsDir: path.join(home, ".zencoder/skills"),
    detectInstalled: () => existsSync(path.join(home, ".zencoder")),
  },
  neovate: {
    id: "neovate",
    displayName: "Neovate",
    projectSkillsDir: ".neovate/skills",
    globalSkillsDir: path.join(home, ".neovate/skills"),
    detectInstalled: () => existsSync(path.join(home, ".neovate")),
  },
  pochi: {
    id: "pochi",
    displayName: "Pochi",
    projectSkillsDir: ".pochi/skills",
    globalSkillsDir: path.join(home, ".pochi/skills"),
    detectInstalled: () => existsSync(path.join(home, ".pochi")),
  },
};

/**
 * All supported agent IDs
 */
export const ALL_AGENT_IDS: AgentId[] = Object.keys(
  AGENT_CONFIGS,
) as AgentId[];

/**
 * Get configuration for a specific agent
 */
export function getAgentConfig(agentId: AgentId): AgentConfig {
  return AGENT_CONFIGS[agentId];
}

/**
 * Detect which agents are installed on this system
 * @returns Array of installed agent IDs
 */
export function detectInstalledAgents(): AgentId[] {
  return ALL_AGENT_IDS.filter((id) => {
    const config = AGENT_CONFIGS[id];
    try {
      return config.detectInstalled();
    } catch {
      return false;
    }
  });
}

/**
 * Get display names for a list of agent IDs
 */
export function getAgentDisplayNames(agentIds: AgentId[]): string[] {
  return agentIds.map((id) => AGENT_CONFIGS[id].displayName);
}

/**
 * Check if an agent is installed
 */
export function isAgentInstalled(agentId: AgentId): boolean {
  try {
    return AGENT_CONFIGS[agentId].detectInstalled();
  } catch {
    return false;
  }
}
