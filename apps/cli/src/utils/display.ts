import * as p from "@clack/prompts";
import type { SuggestionResult, EnrichedSkill } from "./suggest";
import type { AceConfig } from "./config";
import { getAgentConfig } from "./agents";

export async function displaySuggestions(
  data: SuggestionResult,
  config: AceConfig,
): Promise<void> {
  if (data.skills.length === 0) {
    p.log.warn("No skills found matching your project.");
    return;
  }

  const options = data.skills.map((skill) => ({
    value: skill,
    label: skill.name,
    hint: `${skill.packages[0] || "search"} · ${formatInstalls(skill.installs)} installs`,
  }));

  const selected = await p.multiselect({
    message: `Found ${data.skills.length} skills. Select to install:`,
    options,
    required: false,
  });

  if (p.isCancel(selected) || selected.length === 0) {
    p.log.info("No skills selected.");
    return;
  }

  await installSkills(selected as EnrichedSkill[], config);
}

async function installSkills(skills: EnrichedSkill[], config: AceConfig): Promise<void> {
  const s = p.spinner();
  let totalInstalled = 0;

  for (const skill of skills) {
    const source = skill.source || skill.repo;
    if (!source) {
      p.log.warn(`Skipping ${skill.name} - no source found`);
      continue;
    }

    // Install to each configured agent
    for (const agentId of config.agents) {
      const agentConfig = getAgentConfig(agentId);
      s.start(`Installing ${skill.name} for ${agentConfig.displayName}...`);

      // Build the install command with agent and scope flags
      const args = ["skills", "add", `${source}@${skill.name}`];

      // Add agent flag
      args.push("--agent", agentId);

      // Add scope flag
      if (config.scope === "global") {
        args.push("--global");
      }

      try {
        const proc = Bun.spawn(["npx", ...args], {
          stdout: "pipe",
          stderr: "pipe",
        });

        const exitCode = await proc.exited;

        if (exitCode === 0) {
          s.stop(`Installed ${skill.name} for ${agentConfig.displayName}`);
          totalInstalled++;
        } else {
          const stderr = await new Response(proc.stderr).text();
          s.stop(`Failed to install ${skill.name} for ${agentConfig.displayName}`);
          if (stderr) {
            p.log.error(stderr.trim());
          }
        }
      } catch (err) {
        s.stop(`Failed to install ${skill.name} for ${agentConfig.displayName}`);
        p.log.error(err instanceof Error ? err.message : String(err));
      }
    }
  }

  if (totalInstalled > 0) {
    const agentNames = config.agents.map(id => getAgentConfig(id).displayName).join(", ");
    p.log.success(`Installed ${totalInstalled} skill(s) across ${agentNames}`);
  }
}

function formatInstalls(installs: number): string {
  if (installs >= 1000000) {
    return `${(installs / 1000000).toFixed(1)}M`;
  }
  if (installs >= 1000) {
    return `${(installs / 1000).toFixed(1)}K`;
  }
  return installs.toString();
}
