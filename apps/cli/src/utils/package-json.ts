import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readPackageJson(cwd: string): Promise<string[]> {
  const packageJsonPath = path.join(cwd, "package.json");
  try {
    const content = await readFile(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content);
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };
    return Object.keys(deps);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
