import * as p from "@clack/prompts";
import type { SuggestionResult } from "@/utils/suggest";
import type { AceConfig } from "@/utils/config";
import { installSkills } from "@/utils/install";

export async function displaySuggestions(
  data: SuggestionResult,
  config: AceConfig,
  cwd: string,
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

  await installSkills(selected as any, config, cwd);
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
