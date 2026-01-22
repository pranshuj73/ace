## Upskill CLI (open-source skills)

**Goal**: An open-source skills ecosystem and CLI that suggests and manages AI agent skills based on your codebase (starting with Cursor-focused workflows).

### Install & Run

- **npx / bunx style** (once published):
  - `npx upskill-cli suggest`
  - `bunx upskill-cli suggest`

For now, clone the repo and run:

- `bun install` / `npm install` / `yarn install`
- `bun run build` / `npm run build`
- `bun run dist/index.cjs suggest` / `node dist/index.cjs suggest`

### Commands

- **`upskill suggest`**:
  - Reads `package.json` in the current directory.
  - Loads `.upskill/skills-registry.json`.
  - Suggests skills whose `targetPackages` intersect with your dependencies.
  - Options:
    - `--agents cursor gemini windsurf agent` (select one or more target agents)
    - `--scope project|global` (installation scope, currently informational)

- **`upskill review`**:
  - Reviews and displays all mapped skills in the registry.
  - Useful for verifying inference quality and identifying skills that need manual mapping.
  - Options:
    - `--filter mapped|unmapped|all` (filter by mapping status, default: `all`)
    - `--package <name>` (filter by target package, e.g., `--package react`)
    - `--tag <name>` (filter by tag, e.g., `--tag frontend`)
    - `--limit <n>` (limit number of skills shown)
    - `--stats` (show statistics summary only)

  Examples:
  ```bash
  # Review all skills
  upskill review

  # Show only unmapped skills (need manual mapping)
  upskill review --filter unmapped

  # Show skills targeting React
  upskill review --package react

  # Show statistics only
  upskill review --stats

  # Show first 20 unmapped skills
  upskill review --filter unmapped --limit 20
  ```

### Registry format

The local registry lives at `.upskill/skills-registry.json`:

```json
{
  "skills": [
    {
      "id": "vercel-react-best-practices",
      "title": "Vercel React Best Practices",
      "description": "Guidance for building high-quality React apps on Vercel with modern best practices.",
      "repo": "vercel-labs/agent-skills",
      "tags": ["react", "vercel", "frontend"],
      "targetPackages": ["react", "react-dom", "next"]
    }
  ]
}
```

### Building the Registry

The registry is built from scraped skills data:

1. **Scrape skills from skills.sh** (using the browser console script - see below)
2. **Save the output** as `scraped.json` in the project root
3. **Build the registry**:
   ```bash
   bun run build-registry
   # or: npm run build-registry
   ```

This will:
- Filter skills with < 100 installs
- Extract repo information from hrefs
- Infer `targetPackages` using heuristics and manual mappings
- Write the registry to `.upskill/skills-registry.json`

**Package Mappings**: Manual overrides and heuristics are defined in `.upskill/package-mappings.json`. You can edit this file to add or refine package mappings for specific skills.

**Reviewing Mappings**: After building the registry, use `upskill review` to:
- See which skills have been mapped vs. which need manual mapping
- Filter by package, tag, or mapping status
- View statistics about the registry
- Identify skills that might need manual mapping in `package-mappings.json`

**Heuristics used**:
- Skill name patterns (e.g., "react-native-best-practices" → `["react-native"]`)
- Repo owner patterns (e.g., "expo/skills" → `["expo"]`)
- Manual mappings (from `package-mappings.json`)

### Browser Scraper Script

To scrape skills from the skills.sh dashboard, paste this in the browser console:

```javascript
(() => {
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const container = document.querySelector("div.divide-y.divide-border");
  if (!container) {
    console.error("Could not find leaderboard container.");
    return;
  }
  const anchors = Array.from(container.querySelectorAll("a[href^='/'][href*='/']"));
  const skills = anchors.map((a, idx) => {
    const text = norm(a.textContent || "");
    const href = a.getAttribute("href") || "";
    const parts = text.split(/\s+/);
    const rank = parseInt(parts[0]) || idx + 1;
    const name = href.split("/").pop() || "";
    const repoMatch = href.match(/^\/([^/]+\/[^/]+)\//);
    const repo = repoMatch ? repoMatch[1] : "";
    const installsMatch = text.match(/(\d+(?:\.\d+)?[KkMm]?)\s*$/);
    const installs = installsMatch ? installsMatch[1] : null;
    return { rank, name, repo, installs, href, rawText: text };
  });
  console.log(JSON.stringify(skills, null, 2));
  console.log(`\n✅ Scraped ${skills.length} skills. Copy the JSON above.`);
})();
```

Future versions will:

- Support richer manifest metadata (e.g. SKILL.md-like content, resources).
- Implement actual installation/materialization into `.cursor`, `.agent`, `.gemini`, `.windsurf` with configurable scopes.

