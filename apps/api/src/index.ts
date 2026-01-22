import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

const app = new Elysia()
  .use(cors())
  .get("/", () => {
    return {
      message: "Upskill API",
      version: "0.1.0",
      endpoints: {
        suggest: "/api/v1/skills/suggest",
        skill: "/api/v1/skills/:skillId",
        package: "/api/v1/packages/:packageName/skills",
        stats: "/api/v1/stats",
      },
    };
  })
  .get("/health", () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  })
  .listen(3000);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
