import * as p from "@clack/prompts";
import { readPackageJson } from "@/utils/package-json";
import { getInstalledSkills } from "@/utils/installed-skills";
import { generateSuggestions } from "@/utils/suggest";
import { ensureConfig, syncInstalledSkills } from "@/utils/config";
import { searchSkillsVercel } from "@/utils/vercel-api";
import { installSkills } from "@/utils/install";
import type { EnrichedSkill } from "@/utils/suggest";

export async function runMainFlow(currentDir: string, limit: number): Promise<void> {
  console.log(`
█████╗  ██████╗███████╗
██╔══██╗██╔════╝██╔════╝
███████║██║     █████╗
██╔══██║██║     ██╔══╝
██║  ██║╚██████╗███████╗
╚═╝  ╚═╝ ╚═════╝╚══════╝
`);
  p.intro("ace - skill discovery");

  try {
    // Start reading package.json immediately
    const packagesPromise = readPackageJson(currentDir);

    // Setup config (will prompt user if first run)
    const config = await ensureConfig(currentDir);

    if (!config) {
      p.outro("Cancelled");
      return;
    }

    const s = p.spinner();
    s.start("Analyzing project...");

    // Sync and read installed skills (runs in parallel with package.json read)
    const syncPromise = syncInstalledSkills(currentDir);
    await syncPromise;

    const installedSkills = getInstalledSkills(
      currentDir,
      config.agents,
      config.scope,
    );

    // Now wait for package.json if not ready yet
    const packages = await packagesPromise;

    s.message("Searching for skills...");

    const suggestions = await generateSuggestions(
      currentDir,
      config.agents,
      config.scope,
      limit,
      packages,
      installedSkills,
    );

    s.stop("Analysis complete");

    // Collect all skills to install
    const selectedSkills: EnrichedSkill[] = [];

    // Step 1: Show suggestions if available
    if (suggestions.skills.length > 0) {
      const suggestionOptions = suggestions.skills.map((skill) => ({
        value: skill,
        label: skill.name,
        hint: `${skill.packages[0] || "search"} · ${formatInstalls(skill.installs)} installs`,
      }));

      const selected = await p.multiselect({
        message: `Found ${suggestions.skills.length} suggested skills. Select to install:`,
        options: suggestionOptions,
        required: false,
      });

      if (!p.isCancel(selected)) {
        selectedSkills.push(...(selected as EnrichedSkill[]));
      }
    } else {
      p.log.warn("No suggestions found for your project.");
    }

    // Step 2: Ask if user wants to search for more skills
    const wantMore = await p.confirm({
      message: "Would you like to search for more skills?",
      initialValue: false,
    });

    if (!p.isCancel(wantMore) && wantMore) {
      await searchAndSelectSkills(selectedSkills, installedSkills);
    }

    // Step 3: Show confirmation with total count
    if (selectedSkills.length === 0) {
      p.log.info("No skills selected.");
      p.outro("Done");
      return;
    }

    const proceed = await p.confirm({
      message: `Selected ${selectedSkills.length} skill${selectedSkills.length === 1 ? "" : "s"} to install. Proceed?`,
      initialValue: true,
    });

    if (p.isCancel(proceed) || !proceed) {
      p.log.info("Installation cancelled.");
      p.outro("Cancelled");
      return;
    }

    // Step 4: Install all selected skills
    await installSkills(selectedSkills, config, currentDir);

    p.outro("Done");
  } catch (error) {
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Interactive search and selection of additional skills
 */
async function searchAndSelectSkills(
  selectedSkills: EnrichedSkill[],
  installedSkills: string[],
): Promise<void> {
  const totalSelected = () => selectedSkills.length;

  while (true) {
    const query = await p.text({
      message: `Search for skills (${totalSelected()} selected, ESC to finish):`,
      placeholder: "e.g., react, typescript, testing",
    });

    if (p.isCancel(query) || !query) {
      break;
    }

    const results = await searchSkillsVercel(query as string, 20);

    if (results.length === 0) {
      // Use note instead of separate prompt
      p.note(`No skills found for "${query}". Try another search.`);
      continue;
    }

    // Filter out already selected and installed skills
    const selectedNames = new Set(selectedSkills.map((s) => s.name));
    const installedNames = new Set(installedSkills);

    const filteredResults = results.filter(
      (skill) => !selectedNames.has(skill.name) && !installedNames.has(skill.name),
    );

    if (filteredResults.length === 0) {
      p.note("All found skills are already selected or installed. Try another search.");
      continue;
    }

    const searchOptions = filteredResults.map((skill) => ({
      value: skill,
      label: skill.name,
      hint: `${formatInstalls(skill.installs)} installs`,
    }));

    const selected = await p.multiselect({
      message: `Found ${filteredResults.length} skills - select to add:`,
      options: searchOptions,
      required: false,
    });

    if (p.isCancel(selected)) {
      break;
    }

    if (selected.length > 0) {
      // Convert Vercel skills to EnrichedSkill format
      const enriched = (selected as any[]).map((skill) => ({
        name: skill.name,
        title: skill.name,
        description: null,
        repo: skill.topSource || skill.id,
        source: skill.topSource,
        installs: skill.installs,
        packages: [],
        matchType: "search" as const,
        relevanceScore: Math.log10(skill.installs + 1) * 100,
      }));

      selectedSkills.push(...enriched);
    }

    // Loop back to search prompt automatically
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
