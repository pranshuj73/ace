import { Elysia } from "elysia";

export const healthRoutes = new Elysia().get("/health", () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});
