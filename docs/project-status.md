# Upskill Project Status (For Future Me)

This doc is a quick "brain refresh" for the current state of the Upskill
monorepo, what exists today, and what to build next.

## Current Snapshot

- Monorepo with two apps:
  - API: `apps/api` (Bun + Elysia)
  - CLI: `apps/cli` (Bun + yargs)
- API exposes DB-backed endpoints:
   - `GET /` for info
   - `GET /health` for status
   - `GET /api/v1/skills/suggest`
   - `GET /api/v1/skills/:skillId`
   - `GET /api/v1/packages/:packageName/skills`
- CLI commands exist but are placeholders:
  - `upskill suggest` -> TODO (prints "coming soon")
  - `upskill review` -> TODO (prints "coming soon")
- Local data sources (seed inputs):
  - `scraped.json`: raw scrape data (large list of skills)
  - `.upskill/skills-registry.json`: normalized skills list
  - `.upskill/package-mappings.json`: skillId -> package[] mapping (partial)
- Database: Turso (libSQL) + Drizzle ORM
- Architecture docs exist in `docs/` with both "full" and "simplified" plans.

## Decisions So Far

- Recommendation logic is rule-based, no ML for v1.
- Ranking uses `installs` count (higher is better).
- Two-tier matching order:
  1. package.json matches (highest priority)
  2. installed skill matches (secondary)
- Tags are auto-generated metadata for filtering in `review`; not used for
  recommendation ranking.
- CLI should use API if available, but keep local JSON registry as fallback.

## Where the Code Is

- API server entry: `apps/api/src/index.ts` (routers in `apps/api/src/routes/`)
- DB schema: `apps/api/src/db/schema.ts`
- Seed SQL generator: `scripts/seed-turso.ts` -> `scripts/seed-turso.sql`
- CLI entry: `apps/cli/src/index.ts`
- Raw skills data: `scraped.json`
- Registry + mappings: `.upskill/skills-registry.json`,
  `.upskill/package-mappings.json`
- Recommendation spec: `docs/recommendation-logic.md`
- Architecture options:
  - `docs/architecture-simplified.md` (rule-based, minimal)
  - `docs/architecture-summary.md` (more advanced, optional additions)
- Example API implementation (not wired): `docs/api-example.ts`

## Gaps / Missing Pieces

- CLI does not read `package.json` or detect installed skills.
- No fallback logic to read local registry if API is down.
- No ETL pipeline to update registry and mappings from `scraped.json`.

## Next Steps (Priority Order)

1. CLI: read `package.json` dependencies and detect installed skills.
2. CLI: wire `suggest` command to API and display results.
3. CLI: implement `review` command with filter/stats options using registry.
4. Build ETL pipeline: `scraped.json` -> registry + package mappings + tags.

## Quick Start (From README)

```bash
bun install
bun run dev:api
bun run dev:cli
```

## Notes

- The simplified architecture doc is the preferred v1 plan.
- The "full" architecture doc lists optional enhancements (confidence scores,
  analytics, user preferences, ML ranking) but is not required yet.
- Current DB schema uses integer IDs with `name` (skills) and `name` (packages).
