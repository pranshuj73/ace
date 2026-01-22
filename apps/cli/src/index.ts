#!/usr/bin/env bun

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const API_BASE = process.env.UPSKILL_API_URL || "http://localhost:3000";

async function suggestSkills(packages: string[], installedSkills: string[] = []) {
  const params = new URLSearchParams();
  packages.forEach((pkg) => params.append("packages", pkg));
  installedSkills.forEach((skill) => params.append("installed_skills", skill));

  try {
    const response = await fetch(`${API_BASE}/api/v1/skills/suggest?${params}`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    process.exit(1);
  }
}

function main() {
  yargs(hideBin(process.argv))
    .scriptName("upskill")
    .command(
      "suggest",
      "Suggest skills based on package.json and installed skills",
      (y) =>
        y
          .option("agents", {
            type: "array",
            describe: "Target agents (cursor, gemini, windsurf, agent)",
          })
          .option("scope", {
            type: "string",
            choices: ["project", "global"] as const,
            default: "project",
            describe: "Installation scope",
          }),
      async (args) => {
        // TODO: Read package.json and detect installed skills
        console.log("Suggest command - coming soon!");
        console.log("API base:", API_BASE);
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
        // TODO: Implement review command
        console.log("Review command - coming soon!");
      },
    )
    .demandCommand(1)
    .help()
    .strict()
    .parse();
}

main();
