#!/usr/bin/env bun

import * as p from "@clack/prompts";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { cwd } from "node:process";
import { readPackageJson } from "./utils/package-json";
import { getInstalledSkills, type AgentId } from "./utils/installed-skills";
import { generateSuggestions } from "./utils/suggest";
import { displaySuggestions } from "./utils/display";

function main() {
  yargs(hideBin(process.argv))
    .scriptName("ace")
    .usage("Usage: ace <command> [options]")
    .command(
      "suggest",
      "Suggest skills based on your project",
      (y) =>
        y
          .option("agents", {
            type: "array",
            describe: "Target specific agents",
          })
          .option("scope", {
            type: "string",
            choices: ["project", "global", "both"] as const,
            default: "project",
          })
          .option("limit", {
            type: "number",
            default: 10,
          }),
      async (args) => {
        p.intro("ace - skill discovery");

        const currentDir = cwd();
        const agentsToUse = args.agents ? (args.agents as AgentId[]) : undefined;

        const s = p.spinner();
        s.start("Analyzing project...");

        try {
          const packages = await readPackageJson(currentDir);
          const installedSkills = getInstalledSkills(
            currentDir,
            agentsToUse,
            args.scope as "project" | "global" | "both",
          );

          if (packages.length === 0 && installedSkills.length === 0) {
            s.stop("No packages or skills found");
            p.log.warn("Make sure you're in a project with a package.json");
            p.outro("Done");
            return;
          }

          s.message("Searching for skills...");

          const suggestions = await generateSuggestions(
            currentDir,
            agentsToUse,
            args.scope as "project" | "global" | "both",
            args.limit,
          );

          s.stop(`Found ${packages.length} packages, ${installedSkills.length} installed skills`);

          await displaySuggestions(suggestions);

          p.outro("Done");
        } catch (error) {
          s.stop("Error");
          p.log.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      },
    )
    .demandCommand(1, "Please specify a command")
    .help()
    .alias("help", "h")
    .version("0.1.0")
    .alias("version", "v")
    .strict()
    .parse();
}

main();
