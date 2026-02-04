import * as p from "@clack/prompts";
import { existsSync, mkdirSync, symlinkSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import { getAgentConfig, type AgentId } from "@/utils/agents";
import type { EnrichedSkill } from "@/utils/suggest";
import type { AceConfig } from "@/utils/config";
import { updateSkills } from "@/utils/config";

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

    const skillDir = path.join(centralSkillsDir, skill.name);

    // Skip if already exists
    if (existsSync(skillDir)) {
      s.stop(`${skill.name} already installed`);
      continue;
    }

    try {
      // Clone the skill repository
      // Source format is typically: "username/repo" or "github:username/repo"
      const repoUrl = source.startsWith("http")
        ? source
        : `https://github.com/${source}`;

      // Clone into temp directory first
      const tempDir = path.join(centralSkillsDir, `.temp-${skill.name}`);

      const cloneProc = Bun.spawn(
        ["git", "clone", "--depth", "1", repoUrl, tempDir],
        {
          stdout: "pipe",
          stderr: "pipe",
        },
      );

      const exitCode = await cloneProc.exited;

      if (exitCode !== 0) {
        const stderr = await new Response(cloneProc.stderr).text();
        s.stop(`Failed to clone ${skill.name}`);
        if (stderr) {
          p.log.error(stderr.trim());
        }
        continue;
      }

      // Check if skill is in a subdirectory (monorepo pattern)
      const skillPath = path.join(tempDir, skill.name);
      const sourceDir = existsSync(skillPath) ? skillPath : tempDir;

      // Move to final location
      const { renameSync, rmSync } = await import("node:fs");
      renameSync(sourceDir, skillDir);

      // Clean up temp directory if it still exists
      if (existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }

      s.stop(`Installed ${skill.name}`);
      installed++;

      // Update config with installed skill
      updateSkills(cwd, skill.name, source);
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
