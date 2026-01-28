import * as p from "@clack/prompts";
import type { SuggestionResult, EnrichedSkill } from "./suggest";

export async function displaySuggestions(data: SuggestionResult): Promise<void> {
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

  await installSkills(selected as EnrichedSkill[]);
}

async function installSkills(skills: EnrichedSkill[]): Promise<void> {
  const s = p.spinner();

  for (const skill of skills) {
    const source = skill.source || skill.repo;
    if (!source) {
      p.log.warn(`Skipping ${skill.name} - no source found`);
      continue;
    }

    const cmd = `npx skills add ${source}@${skill.name}`;
    s.start(`Installing ${skill.name}...`);

    try {
      const proc = Bun.spawn(["npx", "skills", "add", `${source}@${skill.name}`], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const exitCode = await proc.exited;

      if (exitCode === 0) {
        s.stop(`Installed ${skill.name}`);
      } else {
        const stderr = await new Response(proc.stderr).text();
        s.stop(`Failed to install ${skill.name}`);
        p.log.error(stderr || `Exit code: ${exitCode}`);
      }
    } catch (err) {
      s.stop(`Failed to install ${skill.name}`);
      p.log.error(err instanceof Error ? err.message : String(err));
    }
  }

  p.log.success(`Done! Installed ${skills.length} skill(s).`);
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
