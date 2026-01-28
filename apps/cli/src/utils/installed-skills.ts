import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  type AgentId,
  ALL_AGENT_IDS,
  getAgentConfig,
  detectInstalledAgents,
} from "./agents";

export type { AgentId } from "./agents";

/**
 * Get installed skills across specified agents
 * @param cwd - Current working directory
 * @param agents - Array of agent IDs to check (default: all installed agents)
 * @param scope - Check project, global, or both
 * @returns Array of unique skill names
 */
export function getInstalledSkills(
  cwd: string,
  agents?: AgentId[],
  scope: "project" | "global" | "both" = "project",
): string[] {
  const installed = new Set<string>();

  // If no agents specified, auto-detect installed agents
  const agentsToCheck = agents || detectInstalledAgents();

  // If still no agents, check common ones as fallback
  if (agentsToCheck.length === 0) {
    agentsToCheck.push("cursor", "claude-code", "windsurf", "gemini-cli");
  }

  for (const agentId of agentsToCheck) {
    try {
      const config = getAgentConfig(agentId);

      // Check project-level skills
      if (scope === "project" || scope === "both") {
        const projectPath = path.join(cwd, config.projectSkillsDir);
        if (existsSync(projectPath)) {
          const skills = readdirSync(projectPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory() || dirent.isSymbolicLink())
            .map((dirent) => dirent.name);
          skills.forEach((skill) => installed.add(skill));
        }
      }

      // Check global skills
      if (scope === "global" || scope === "both") {
        const globalPath = config.globalSkillsDir;
        if (existsSync(globalPath)) {
          const skills = readdirSync(globalPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory() || dirent.isSymbolicLink())
            .map((dirent) => dirent.name);
          skills.forEach((skill) => installed.add(skill));
        }
      }
    } catch (error) {
      // Silently skip agents that error (likely not installed or permission issues)
      continue;
    }
  }

  return Array.from(installed).sort();
}

/**
 * Get installed skills grouped by agent
 * @param cwd - Current working directory
 * @param agents - Array of agent IDs to check (default: auto-detect)
 * @param scope - Check project, global, or both
 * @returns Map of agent ID to array of skill names
 */
export function getInstalledSkillsByAgent(
  cwd: string,
  agents?: AgentId[],
  scope: "project" | "global" | "both" = "project",
): Map<AgentId, string[]> {
  const skillsByAgent = new Map<AgentId, string[]>();
  const agentsToCheck = agents || detectInstalledAgents();

  if (agentsToCheck.length === 0) {
    agentsToCheck.push("cursor", "claude-code", "windsurf", "gemini-cli");
  }

  for (const agentId of agentsToCheck) {
    try {
      const config = getAgentConfig(agentId);
      const skills = new Set<string>();

      // Check project-level
      if (scope === "project" || scope === "both") {
        const projectPath = path.join(cwd, config.projectSkillsDir);
        if (existsSync(projectPath)) {
          const projectSkills = readdirSync(projectPath, {
            withFileTypes: true,
          })
            .filter((dirent) => dirent.isDirectory() || dirent.isSymbolicLink())
            .map((dirent) => dirent.name);
          projectSkills.forEach((skill) => skills.add(skill));
        }
      }

      // Check global
      if (scope === "global" || scope === "both") {
        const globalPath = config.globalSkillsDir;
        if (existsSync(globalPath)) {
          const globalSkills = readdirSync(globalPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory() || dirent.isSymbolicLink())
            .map((dirent) => dirent.name);
          globalSkills.forEach((skill) => skills.add(skill));
        }
      }

      if (skills.size > 0) {
        skillsByAgent.set(agentId, Array.from(skills).sort());
      }
    } catch {
      continue;
    }
  }

  return skillsByAgent;
}

/**
 * Check if a specific skill is installed for any agent
 * @param cwd - Current working directory
 * @param skillName - Name of the skill to check
 * @param agents - Array of agent IDs to check (default: auto-detect)
 * @param scope - Check project, global, or both
 * @returns True if the skill is found in any agent
 */
export function isSkillInstalled(
  cwd: string,
  skillName: string,
  agents?: AgentId[],
  scope: "project" | "global" | "both" = "both",
): boolean {
  const installedSkills = getInstalledSkills(cwd, agents, scope);
  return installedSkills.includes(skillName);
}
