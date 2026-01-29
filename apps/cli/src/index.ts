#!/usr/bin/env bun

import * as p from "@clack/prompts";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { cwd } from "node:process";
import { readPackageJson } from "./utils/package-json";
import { getInstalledSkills } from "./utils/installed-skills";
import { generateSuggestions } from "./utils/suggest";
import { displaySuggestions } from "./utils/display";
import { ensureConfig, syncInstalledSkills } from "./utils/config";

function main() {
  yargs(hideBin(process.argv))
    .scriptName("ace")
    .usage("Usage: ace <command> [options]")
    .command(
      "suggest",
      "Suggest and install skills for your project",
      (y) =>
        y.option("limit", {
          type: "number",
          default: 10,
          describe: "Max suggestions to show",
        }),
      async (args) => {
      console.log(`
█████╗  ██████╗███████╗
██╔══██╗██╔════╝██╔════╝
███████║██║     █████╗  
██╔══██║██║     ██╔══╝  
██║  ██║╚██████╗███████╗
╚═╝  ╚═╝ ╚═════╝╚══════╝
`)
        p.intro("ace - skill discovery");

        const currentDir = cwd();

        // Ensure config exists (first-run setup if needed)
        const config = await ensureConfig(currentDir);
        if (!config) {
          p.outro("Setup cancelled");
          return;
        }

        // Sync installed skills with config
        syncInstalledSkills(currentDir);

        const s = p.spinner();
        s.start("Analyzing project...");

        try {
          const packages = await readPackageJson(currentDir);
          const installedSkills = getInstalledSkills(
            currentDir,
            config.agents,
            config.scope,
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
            config.agents,
            config.scope,
            args.limit,
          );

          s.stop(`Found ${packages.length} packages, ${installedSkills.length} installed skills`);

          await displaySuggestions(suggestions, config, currentDir);

          p.outro("Done");
        } catch (error) {
          s.stop("Error");
          p.log.error(error instanceof Error ? error.message : String(error));
          process.exit(1);
        }
      },
    )
    .command(
      "config",
      "Reset configuration",
      () => {},
      async () => {
        const currentDir = cwd();
        const { unlinkSync, existsSync } = await import("node:fs");
        const configPath = `${currentDir}/agents.json`;

        if (existsSync(configPath)) {
          unlinkSync(configPath);
          p.log.info("Config reset. Run 'ace suggest' to reconfigure.");
        } else {
          p.log.warn("No config found.");
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
