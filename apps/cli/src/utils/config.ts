import * as p from "@clack/prompts";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getAgentConfig, type AgentId } from "./agents";
import { detectInstalledAgents, POPULAR_AGENTS } from "./detect-agents";

export interface AceConfig {
  agents: AgentId[];
  scope: "project" | "global";
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

export async function ensureConfig(cwd: string): Promise<AceConfig | null> {
  const existing = loadConfig(cwd);
  if (existing) {
    return existing;
  }

  // First run - ask for preferences
  p.log.info("First run detected. Let's set up your preferences.");

  // Ask for scope FIRST
  const scope = await p.select({
    message: "Install skills locally (this project) or globally?",
    options: [
      { value: "project" as const, label: "Project", hint: "skills in this project only" },
      { value: "global" as const, label: "Global", hint: "skills available everywhere" },
    ],
  });

  if (p.isCancel(scope)) {
    return null;
  }

  // Auto-detect installed agents based on scope
  const detected = detectInstalledAgents(cwd, scope as "project" | "global");
  const agentsToShow = detected.length > 0 ? detected : POPULAR_AGENTS;

  if (detected.length > 0) {
    p.log.success(`Detected ${detected.length} installed agent(s)`);
  }

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

  const initialSelection = await p.multiselect({
    message: "Which AI agents do you use?",
    options: agentOptions,
    required: true,
  }) as string[];

  if (p.isCancel(initialSelection)) {
    return null;
  }

  let agents = initialSelection.filter(a => a !== "__other__");

  // If user selected "Other...", show full list
  if (initialSelection.includes("__other__")) {
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
    p.log.error("No agents selected");
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
