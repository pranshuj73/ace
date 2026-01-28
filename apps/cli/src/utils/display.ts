import type { SuggestionResult, EnrichedSkill } from "./suggest";

// ANSI color codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const MAGENTA = "\x1b[35m";

export function displaySuggestions(data: SuggestionResult): void {
  if (data.skills.length === 0) {
    console.log(`${DIM}No skills found matching your criteria.${RESET}`);
    console.log(
      `\n${DIM}Try installing some skills from https://skills.sh${RESET}\n`,
    );
    return;
  }

  // Header
  console.log(
    `\n${BOLD}${CYAN}Found ${data.total} skill(s)${RESET} ${DIM}(showing ${data.skills.length})${RESET}\n`,
  );

  // Source indicator
  const sourceEmoji =
    data.sourcedFrom === "own-api"
      ? "🎯"
      : data.sourcedFrom === "hybrid"
        ? "🔄"
        : "🔍";
  const sourceLabel =
    data.sourcedFrom === "own-api"
      ? "Database"
      : data.sourcedFrom === "hybrid"
        ? "Hybrid"
        : "Vercel API";
  console.log(`${DIM}${sourceEmoji} Source: ${sourceLabel}${RESET}\n`);

  // Matched context
  if (data.matchedPackages.length > 0) {
    console.log(
      `${GREEN}📦 Matched packages:${RESET} ${DIM}${data.matchedPackages.join(", ")}${RESET}`,
    );
  }
  if (data.matchedInstalledSkills.length > 0) {
    console.log(
      `${YELLOW}✓ Matched installed skills:${RESET} ${DIM}${data.matchedInstalledSkills.join(", ")}${RESET}`,
    );
  }

  if (
    data.matchedPackages.length > 0 ||
    data.matchedInstalledSkills.length > 0
  ) {
    console.log();
  }

  console.log("─".repeat(80));

  // Skills list
  for (let i = 0; i < data.skills.length; i++) {
    const skill = data.skills[i];
    displaySkill(skill, i + 1);
  }

  console.log("─".repeat(80));

  // Footer with installation hint
  console.log(
    `\n${DIM}💡 To install a skill, use:${RESET} ${CYAN}npx skills add <source>@<skill-name>${RESET}`,
  );
  console.log(
    `${DIM}   Or visit:${RESET} ${CYAN}https://skills.sh${RESET} ${DIM}to browse more${RESET}\n`,
  );
}

function displaySkill(skill: EnrichedSkill, index: number): void {
  // Match type badge
  const matchBadge = getMatchBadge(skill.matchType);
  const installsStr = formatInstalls(skill.installs);

  console.log(`\n${BOLD}${index}. ${skill.title}${RESET} ${matchBadge}`);
  console.log(`   ${DIM}Name:${RESET} ${skill.name}`);

  if (skill.source) {
    console.log(`   ${DIM}Source:${RESET} ${skill.source}`);
  } else if (skill.repo) {
    console.log(`   ${DIM}Repo:${RESET} ${skill.repo}`);
  }

  if (skill.description) {
    // Wrap long descriptions
    const wrapped = wrapText(skill.description, 70);
    console.log(`   ${DIM}${wrapped}${RESET}`);
  }

  if (skill.packages.length > 0) {
    console.log(`   ${DIM}Packages:${RESET} ${skill.packages.join(", ")}`);
  }

  console.log(`   ${DIM}Installs:${RESET} ${installsStr}`);

  // Installation command hint
  const installSource = skill.source || skill.repo;
  if (installSource) {
    console.log(
      `   ${DIM}Install:${RESET} ${CYAN}npx skills add ${installSource}@${skill.name}${RESET}`,
    );
  }
}

function getMatchBadge(
  matchType: "package_json" | "installed_skill" | "search",
): string {
  switch (matchType) {
    case "package_json":
      return `${GREEN}[package.json]${RESET}`;
    case "installed_skill":
      return `${YELLOW}[related]${RESET}`;
    case "search":
      return `${MAGENTA}[search]${RESET}`;
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

function wrapText(text: string, maxWidth: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.join("\n   ");
}
