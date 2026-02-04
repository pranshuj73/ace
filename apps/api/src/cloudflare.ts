import { Elysia } from "elysia";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";
import { cors } from "@elysiajs/cors";
import { env } from "cloudflare:workers";
import {
  healthRoutes,
  packagesRoutes,
  rootRoutes,
  skillsRoutes,
} from "@/routes";
import { initDb } from "@/db";

// Cloudflare Workers entry point
// Initialize DB with env from Cloudflare Workers bindings
// Wrangler injects env vars from .dev.vars (local) or secrets (production)
initDb({
  DATABASE_URL: env.DATABASE_URL,
  DATABASE_API_TOKEN: env.DATABASE_API_TOKEN,
});

export default new Elysia({
  adapter: CloudflareAdapter,
})
  .use(cors())
  .use(rootRoutes)
  .use(healthRoutes)
  .use(skillsRoutes)
  .use(packagesRoutes)
  .compile();
