import * as p from "@clack/prompts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import { getAgentConfig, type AgentId } from "@/utils/agents";
import { detectInstalledAgents, POPULAR_AGENTS } from "@/utils/detect-agents";

export interface AceConfig {
  agents: AgentId[];
  scope: "project" | "global";
  skills: Record<string, string>; // skill-name -> source
}

const CONFIG_FILE = "agents.json";

export function getConfigPath(cwd: string): string {
  return path.join(cwd, CONFIG_FILE);
}

export function loadConfig(cwd: string): AceConfig | null {
  const configPath = getConfigPath(cwd);
  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content) as AceConfig;
  } catch {
    return null;
  }
}

export function saveConfig(cwd: string, config: AceConfig): void {
  const configPath = getConfigPath(cwd);
  writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

export function updateSkills(
  cwd: string,
  skillName: string,
  source: string,
): void {
  const config = loadConfig(cwd);
  if (!config) return;

  config.skills[skillName] = source;
  saveConfig(cwd, config);
}

export async function syncInstalledSkills(cwd: string): Promise<void> {
  const config = loadConfig(cwd);
  if (!config) return;

  const baseDir = config.scope === "global" ? homedir() : cwd;
  const skillsDir = path.join(baseDir, ".agents", "skills");

  if (!existsSync(skillsDir)) return;

  // Read installed skills from filesystem
  const dirents = await readdir(skillsDir, { withFileTypes: true });
  const installedSkills = dirents
    .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith("."))
    .map((dirent) => dirent.name);

  // Sync with config - keep existing sources, add new ones with placeholder
  const newSkills: Record<string, string> = {};
  for (const skillName of installedSkills) {
    newSkills[skillName] = config.skills[skillName] || "unknown";
  }

  config.skills = newSkills;
  saveConfig(cwd, config);
}

export async function ensureConfig(cwd: string): Promise<AceConfig | null> {
  const existing = loadConfig(cwd);
  if (existing) {
    return existing;
  }

  // First run - ask for preferences
  const group = await p.group(
    {
      scope: () =>
        p.select({
          message: "Install skills locally (this project) or globally?",
          options: [
            { value: "project" as const, label: "Project", hint: "skills in this project only" },
            { value: "global" as const, label: "Global", hint: "skills available everywhere" },
          ],
        }),
      agents: ({ results }) => {
        const scope = results.scope as "project" | "global";
        // Auto-detect installed agents based on scope
        const detected = detectInstalledAgents(cwd, scope);
        const agentsToShow = detected.length > 0 ? detected : POPULAR_AGENTS;

        const agentOptions = agentsToShow.map((id) => {
          const cfg = getAgentConfig(id);
          return {
            value: id as string,
            label: cfg.displayName,
            hint: detected.includes(id) ? "detected" : undefined,
          };
        });

        // Add "Other..." option to show full list
        agentOptions.push({
          value: "__other__",
          label: "Other agents...",
          hint: "show all 33 agents",
        });

        return p.multiselect({
          message: "Which AI agents do you use?",
          options: agentOptions,
          required: true,
        }) as Promise<string[]>;
      },
    },
    {
      onCancel: () => {
        p.cancel("Setup cancelled");
        process.exit(0);
      },
    },
  );

  let agents = group.agents.filter((a: string) => a !== "__other__");

  // If user selected "Other...", show full list
  if (group.agents.includes("__other__")) {
    const { ALL_AGENT_IDS } = await import("./agents");
    const allOptions = ALL_AGENT_IDS.map((id) => {
      const cfg = getAgentConfig(id);
      return {
        value: id as string,
        label: cfg.displayName,
      };
    });

    const additionalAgents = await p.multiselect({
      message: "Select from all agents:",
      options: allOptions,
      required: false,
    }) as string[];

    if (!p.isCancel(additionalAgents)) {
      agents = [...agents, ...additionalAgents];
    }
  }

  if (agents.length === 0) {
    p.cancel("No agents selected");
    process.exit(0);
  }

  const config: AceConfig = {
    agents: agents as AgentId[],
    scope: group.scope as "project" | "global",
    skills: {},
  };

  saveConfig(cwd, config);

  return config;
}
