import * as p from "@clack/prompts";
import { existsSync, mkdirSync, symlinkSync, rmSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { getAgentConfig, type AgentId } from "./agents";
import type { EnrichedSkill } from "./suggest";
import type { AceConfig } from "./config";

/**
 * Install skills using centralized .agents/skills/ directory with symlinks
 */
export async function installSkills(
  skills: EnrichedSkill[],
  config: AceConfig,
  cwd: string,
): Promise<void> {
  const s = p.spinner();
  const home = homedir();

  // Determine base directory based on scope
  const baseDir = config.scope === "global" ? home : cwd;
  const centralSkillsDir = path.join(baseDir, ".agents", "skills");

  // Ensure .agents/skills/ exists
  if (!existsSync(centralSkillsDir)) {
    mkdirSync(centralSkillsDir, { recursive: true });
    p.log.info(`Created central skills directory: ${centralSkillsDir}`);
  }

  // Setup symlinks for each agent
  for (const agentId of config.agents) {
    const agentConfig = getAgentConfig(agentId);
    const agentSkillsDir =
      config.scope === "global"
        ? path.join(home, agentConfig.globalSkillsDir)
        : path.join(cwd, agentConfig.projectSkillsDir);

    const agentBaseDir = path.dirname(agentSkillsDir);

    // Create agent base directory if it doesn't exist
    if (!existsSync(agentBaseDir)) {
      mkdirSync(agentBaseDir, { recursive: true });
    }

    // Create symlink if it doesn't exist
    if (!existsSync(agentSkillsDir)) {
      try {
        const relativeTarget = path.relative(agentBaseDir, centralSkillsDir);
        symlinkSync(relativeTarget, agentSkillsDir, "dir");
        p.log.success(`Linked ${agentConfig.displayName} to central skills`);
      } catch (err) {
        p.log.warn(
          `Could not create symlink for ${agentConfig.displayName}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  let installed = 0;

  // Install each skill to central directory
  for (const skill of skills) {
    const source = skill.source || skill.repo;
    if (!source) {
      p.log.warn(`Skipping ${skill.name} - no source found`);
      continue;
    }

    s.start(`Installing ${skill.name}...`);

    const args = ["skills", "add", `${source}@${skill.name}`];

    // Use global flag to install to home directory if global scope
    if (config.scope === "global") {
      args.push("--global");
    }

    // Set custom skills directory via environment variable
    const env = {
      ...process.env,
      SKILLS_DIR: centralSkillsDir,
    };

    try {
      const proc = Bun.spawn(["npx", ...args], {
        stdout: "pipe",
        stderr: "pipe",
        env,
        cwd: baseDir,
      });

      const exitCode = await proc.exited;

      if (exitCode === 0) {
        s.stop(`Installed ${skill.name}`);
        installed++;
      } else {
        const stderr = await new Response(proc.stderr).text();
        s.stop(`Failed to install ${skill.name}`);
        if (stderr) {
          p.log.error(stderr.trim());
        }
      }
    } catch (err) {
      s.stop(`Failed to install ${skill.name}`);
      p.log.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (installed > 0) {
    const agentNames = config.agents
      .map((id) => getAgentConfig(id).displayName)
      .join(", ");
    p.log.success(
      `Installed ${installed} skill(s) to .agents/skills/ (linked to ${agentNames})`,
    );
  }
}
