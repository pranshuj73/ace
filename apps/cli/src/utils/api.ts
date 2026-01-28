import { config } from "../../../../config";

const API_BASE =
  process.env.ACE_API_URL || config.api.baseUrl;

export interface OwnAPISuggestion {
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
}

export async function suggestSkills(
  packages: string[],
  installedSkills: string[] = [],
  limit: number = 10,
): Promise<OwnAPISuggestion> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/skills/suggest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        packages,
        installed_skills: installedSkills,
        limit,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API error (${response.status}): ${errorText || response.statusText}`,
      );
    }
    return (await response.json()) as OwnAPISuggestion;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch suggestions: ${error.message}`);
    }
    throw error;
  }
}
