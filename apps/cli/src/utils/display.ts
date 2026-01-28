import type { SuggestionResult } from "./suggest";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";

export function displaySuggestions(data: SuggestionResult): void {
  if (data.skills.length === 0) {
    console.log(`${DIM}No skills found.${RESET}`);
    return;
  }

  console.log();
  for (const skill of data.skills) {
    const pkg = skill.packages[0] || "-";
    const installs = formatInstalls(skill.installs);
    console.log(`${DIM}[${pkg}|${installs}]${RESET} ${CYAN}${skill.name}${RESET}`);
  }
  console.log();
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
