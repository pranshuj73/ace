import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export type AgentId = "cursor" | "gemini" | "windsurf" | "agent";

export function getInstalledSkills(
  cwd: string,
  agents: AgentId[] = ["cursor", "gemini", "windsurf", "agent"],
  scope: "project" | "global" = "project",
): string[] {
  const installed: string[] = [];

  for (const agent of agents) {
    if (scope === "project" || scope === "global") {
      const projectPath = path.join(cwd, `.${agent}`, "skills");
      if (existsSync(projectPath)) {
        const skills = readdirSync(projectPath, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => dirent.name);
        installed.push(...skills);
      }
    }

    if (scope === "global") {
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      if (homeDir) {
        const globalPath = path.join(homeDir, `.${agent}`, "skills");
        if (existsSync(globalPath)) {
          const skills = readdirSync(globalPath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
          installed.push(...skills);
        }
      }
    }
  }

  return [...new Set(installed)];
}
