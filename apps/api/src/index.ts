import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import {
  healthRoutes,
  packagesRoutes,
  rootRoutes,
  skillsRoutes,
} from "./routes";

const app = new Elysia()
  .use(cors())
  .use(rootRoutes)
  .use(healthRoutes)
  .use(skillsRoutes)
  .use(packagesRoutes)
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
