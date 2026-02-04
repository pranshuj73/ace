import { existsSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { ALL_AGENT_IDS, getAgentConfig, type AgentId } from "@/utils/agents";

/**
 * Detect which agents are actually installed on the system
 * @param cwd - Current working directory (for project scope)
 * @param scope - Where to check for agents
 */
export function detectInstalledAgents(
  cwd: string,
  scope: "project" | "global",
): AgentId[] {
  const detected: AgentId[] = [];
  const home = homedir();

  for (const agentId of ALL_AGENT_IDS) {
    const config = getAgentConfig(agentId);

    if (scope === "global") {
      // Check global directory
      const globalPath = path.join(home, config.globalSkillsDir);
      if (existsSync(globalPath)) {
        detected.push(agentId);
      }
    } else {
      // Check project directory
      const projectPath = path.join(cwd, config.projectSkillsDir);
      if (existsSync(projectPath)) {
        detected.push(agentId);
      }
    }
  }

  return detected;
}

/**
 * Popular agents to show if no agents detected
 */
export const POPULAR_AGENTS: AgentId[] = [
  "cursor",
  "claude-code",
  "windsurf",
  "continue",
  "cline",
  "roo",
];
