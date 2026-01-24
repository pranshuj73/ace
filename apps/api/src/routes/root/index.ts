import { Elysia } from "elysia";

export const rootRoutes = new Elysia().get("/", () => {
  return {
    message: "Upskill API",
    version: "0.1.0",
    endpoints: {
      suggest: "/api/v1/skills/suggest",
      skill: "/api/v1/skills/:skillId",
      package: "/api/v1/packages/:packageName/skills",
    },
  };
});
