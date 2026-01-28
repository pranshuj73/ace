#!/usr/bin/env bun

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { cwd } from "node:process";
import { readPackageJson } from "./utils/package-json";
import { getInstalledSkills, type AgentId } from "./utils/installed-skills";
import { generateSuggestions } from "./utils/suggest";
import { displaySuggestions } from "./utils/display";

// ANSI colors
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";

function showBanner() {
  console.log(`
${CYAN}${BOLD}╔════════════════════════════════════════╗
║   UPSKILL - AI Agent Skill Discovery   ║
╚════════════════════════════════════════╝${RESET}

${DIM}Intelligent skill suggestions for your codebase${RESET}
`);
}

function main() {
  yargs(hideBin(process.argv))
    .scriptName("upskill")
    .usage(`${BOLD}Usage:${RESET} upskill <command> [options]`)
    .command(
      "suggest",
      "Suggest skills based on package.json and installed skills",
      (y) =>
        y
          .option("agents", {
            type: "array",
            describe: "Target agents (cursor, gemini, windsurf, agent)",
            default: ["cursor", "gemini", "windsurf", "agent"],
          })
          .option("scope", {
            type: "string",
            choices: ["project", "global"] as const,
            default: "project",
            describe: "Installation scope",
          })
          .option("limit", {
            type: "number",
            default: 10,
            describe: "Maximum number of suggestions to return",
          }),
      async (args) => {
        showBanner();

        try {
          const currentDir = cwd();

          console.log(`${DIM}Analyzing your project...${RESET}\n`);

          // Quick check for package.json and installed skills
          const packages = await readPackageJson(currentDir);
          const installedSkills = getInstalledSkills(
            currentDir,
            (args.agents || []) as AgentId[],
            args.scope as "project" | "global",
          );

          if (packages.length === 0 && installedSkills.length === 0) {
            console.log(
              `${YELLOW}⚠ No packages found in package.json and no installed skills detected.${RESET}`,
            );
            console.log(
              `${DIM}Make sure you're in a project directory with a package.json file.${RESET}\n`,
            );
            process.exit(0);
          }

          // Show what we found
          if (packages.length > 0) {
            console.log(
              `${GREEN}✓ Found ${packages.length} package(s) in package.json${RESET}`,
            );
            if (packages.length <= 10) {
              console.log(`${DIM}  ${packages.join(", ")}${RESET}`);
            } else {
              console.log(
                `${DIM}  ${packages.slice(0, 10).join(", ")}, and ${packages.length - 10} more...${RESET}`,
              );
            }
          }

          if (installedSkills.length > 0) {
            console.log(
              `${GREEN}✓ Found ${installedSkills.length} installed skill(s)${RESET}`,
            );
            if (installedSkills.length <= 5) {
              console.log(`${DIM}  ${installedSkills.join(", ")}${RESET}`);
            }
          }

          console.log(`\n${DIM}Searching for relevant skills...${RESET}`);

          // Generate suggestions
          const suggestions = await generateSuggestions(
            currentDir,
            (args.agents || []) as AgentId[],
            args.scope as "project" | "global",
            args.limit,
          );

          // Display results
          displaySuggestions(suggestions);
        } catch (error) {
          console.error(
            `${BOLD}Error:${RESET}`,
            error instanceof Error ? error.message : error,
          );
          console.error(
            `\n${DIM}If this persists, please report it at: https://github.com/your-repo/upskill/issues${RESET}\n`,
          );
          process.exit(1);
        }
      },
    )
    .command(
      "review",
      "Review mapped skills in the registry",
      (y) =>
        y
          .option("filter", {
            type: "string",
            choices: ["mapped", "unmapped", "all"] as const,
            default: "all",
            describe: "Filter skills",
          })
          .option("stats", {
            type: "boolean",
            default: false,
            describe: "Show statistics only",
          }),
      async (args) => {
        showBanner();
        console.log(`${YELLOW}Review command - coming soon!${RESET}`);
        console.log(
          `${DIM}This will allow you to browse and review skills in the registry.${RESET}\n`,
        );
      },
    )
    .command(
      "discover",
      "Auto-discover missing skills for your tech stack",
      () => {},
      async () => {
        showBanner();
        console.log(`${YELLOW}Discover command - coming soon!${RESET}`);
        console.log(
          `${DIM}This will analyze your stack and proactively suggest missing skills.${RESET}\n`,
        );
      },
    )
    .demandCommand(1, `${YELLOW}Please specify a command${RESET}`)
    .help()
    .alias("help", "h")
    .version("0.1.0")
    .alias("version", "v")
    .strict()
    .epilog(
      `${DIM}For more information, visit: https://github.com/your-repo/upskill${RESET}`,
    )
    .parse();
}

main();
