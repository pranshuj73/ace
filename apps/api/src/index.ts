import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import {
  healthRoutes,
  packagesRoutes,
  rootRoutes,
  skillsRoutes,
} from "@/routes";

// Initialize DB connection
import "@/db";

// Only run server in Node.js/Bun environment (not Cloudflare Workers)
if (typeof process !== "undefined" && process.env) {
  const app = new Elysia()
    .use(cors())
    .use(rootRoutes)
    .use(healthRoutes)
    .use(skillsRoutes)
    .use(packagesRoutes)
    .listen(3000);

  console.log(
    `Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
  );
}
