export function displaySuggestions(data: {
  skills: Array<{
    id: number;
    name: string;
    title: string;
    description: string | null;
    repo: string;
    installs: number;
    packages: string[];
    match_type: "package_json" | "installed_skill";
  }>;
  total: number;
  matched_packages: string[];
  matched_installed_skills: string[];
}): void {
  if (data.skills.length === 0) {
    console.log("No skills found matching your criteria.");
    return;
  }

  console.log(`\nFound ${data.total} skill(s) (showing ${data.skills.length}):\n`);

  if (data.matched_packages.length > 0) {
    console.log(`Matched packages: ${data.matched_packages.join(", ")}`);
  }
  if (data.matched_installed_skills.length > 0) {
    console.log(
      `Matched installed skills: ${data.matched_installed_skills.join(", ")}`,
    );
  }

  console.log("\n" + "=".repeat(80));

  for (const skill of data.skills) {
    const matchBadge =
      skill.match_type === "package_json" ? "[package.json]" : "[installed]";
    const installsStr =
      skill.installs >= 1000
        ? `${(skill.installs / 1000).toFixed(1)}K`
        : skill.installs.toString();

    console.log(`\n${matchBadge} ${skill.title}`);
    console.log(`   Name: ${skill.name}`);
    console.log(`   Repo: ${skill.repo}`);
    if (skill.description) {
      console.log(`   ${skill.description}`);
    }
    console.log(`   Packages: ${skill.packages.join(", ")}`);
    console.log(`   Installs: ${installsStr}`);
  }

  console.log("\n" + "=".repeat(80) + "\n");
}
