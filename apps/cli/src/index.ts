#!/usr/bin/env bun

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { cwd } from "node:process";
import { readPackageJson } from "./utils/package-json";
import { getInstalledSkills, type AgentId } from "./utils/installed-skills";
import { suggestSkills } from "./utils/api";
import { displaySuggestions } from "./utils/display";

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
        try {
          const currentDir = cwd();
          const [packages, installedSkills] = await Promise.all([
            readPackageJson(currentDir),
            Promise.resolve(
              getInstalledSkills(
                currentDir,
                (args.agents || []) as AgentId[],
                args.scope,
              ),
            ),
          ]);

          if (packages.length === 0 && installedSkills.length === 0) {
            console.log(
              "No packages found in package.json and no installed skills detected.",
            );
            console.log("Make sure you're in a project directory with a package.json file.");
            process.exit(0);
          }

          if (packages.length > 0) {
            console.log(`Found ${packages.length} package(s) in package.json`);
          }
          if (installedSkills.length > 0) {
            console.log(
              `Found ${installedSkills.length} installed skill(s)`,
            );
          }

          console.log("\nFetching suggestions...");
          const data = await suggestSkills(
            packages,
            installedSkills,
            args.limit,
          );
          displaySuggestions(data);
        } catch (error) {
          console.error("Error:", error instanceof Error ? error.message : error);
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
