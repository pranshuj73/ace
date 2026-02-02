#!/usr/bin/env node

import * as p from "@clack/prompts";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { cwd } from "node:process";
import { runMainFlow } from "./utils/flow";

function main() {
  yargs(hideBin(process.argv))
    .scriptName("ace")
    .usage("Usage: ace [options]")
    .command(
      "$0",
      "Discover and install skills for your project",
      (y) =>
        y.option("limit", {
          type: "number",
          default: 10,
          describe: "Max suggestions to show",
        }),
      async (args) => {
        await runMainFlow(cwd(), args.limit);
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
          p.log.info("Config reset. Run 'ace' to reconfigure.");
        } else {
          p.log.warn("No config found.");
        }
      },
    )
    .help()
    .alias("help", "h")
    .version("0.1.0")
    .alias("version", "v")
    .strict()
    .parse();
}

main();
