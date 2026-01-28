# Cloudflare Workers Deployment

This API is configured to run on Cloudflare Workers using Elysia's Cloudflare adapter.

## Setup

### 1. Install Wrangler

```bash
bun add -d wrangler
```

### 2. Configure Environment Variables

For **local development**, create `.dev.vars` file (gitignored):

```bash
DATABASE_URL=your-turso-database-url
DATABASE_API_TOKEN=your-turso-api-token
```

For **production**, set secrets using Wrangler:

```bash
wrangler secret put DATABASE_URL
wrangler secret put DATABASE_API_TOKEN
```

### 3. Development

Run the Cloudflare Workers dev server:

```bash
bun run dev:cloudflare
```

This starts a local server at `http://localhost:8787`

### 4. Deployment

Deploy to Cloudflare Workers:

```bash
bun run deploy
```

Or use Wrangler directly:

```bash
wrangler deploy
```

## Configuration

The `wrangler.toml` file is configured with:
- `compatibility_date: "2025-06-01"` (required for Elysia Cloudflare adapter)
- Main entry point: `src/cloudflare.ts`

## Notes

- The API uses the same codebase for both Bun (local dev) and Cloudflare Workers (production)
- DB connection is initialized at module load time
- Environment variables are accessed through Wrangler's injection mechanism
- For local Bun development, use `bun run dev` (uses `src/index.ts`)
- For Cloudflare Workers, use `bun run dev:cloudflare` (uses `src/cloudflare.ts`)
