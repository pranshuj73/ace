import * as p from "@clack/prompts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ALL_AGENT_IDS, getAgentConfig, type AgentId } from "./agents";

export interface AceConfig {
  agents: AgentId[];
  scope: "project" | "global";
}

const CONFIG_FILE = ".ace.json";

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

export async function ensureConfig(cwd: string): Promise<AceConfig | null> {
  const existing = loadConfig(cwd);
  if (existing) {
    return existing;
  }

  // First run - ask for preferences
  p.log.info("First run detected. Let's set up your preferences.");

  const agentOptions = ALL_AGENT_IDS.map((id) => {
    const cfg = getAgentConfig(id);
    return {
      value: id as string,
      label: cfg.displayName,
    };
  });

  const agents = await p.multiselect({
    message: "Which AI agents do you use? (select multiple)",
    options: agentOptions,
    required: true,
  }) as string[];

  if (p.isCancel(agents) || agents.length === 0) {
    return null;
  }

  const scope = await p.select({
    message: "Install skills locally (this project) or globally?",
    options: [
      { value: "project" as const, label: "Project", hint: "skills available only in this project" },
      { value: "global" as const, label: "Global", hint: "skills available everywhere" },
    ],
  });

  if (p.isCancel(scope)) {
    return null;
  }

  const config: AceConfig = {
    agents: agents as AgentId[],
    scope: scope as "project" | "global",
  };

  saveConfig(cwd, config);
  p.log.success(`Saved preferences to ${CONFIG_FILE}`);

  return config;
}
