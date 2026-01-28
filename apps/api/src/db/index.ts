import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import type { schema } from "./schema";

let dbInstance: LibSQLDatabase<typeof schema> | null = null;

// Initialize DB connection
export function initDb(env?: {
  DATABASE_URL?: string;
  DATABASE_API_TOKEN?: string;
}) {
  if (dbInstance) {
    return dbInstance;
  }

  // Support both Node.js/Bun (process.env) and Cloudflare Workers
  // In Cloudflare Workers, process doesn't exist, so we check first
  const processEnv =
    typeof process !== "undefined" && process.env ? process.env : undefined;

  const url =
    env?.DATABASE_URL ||
    processEnv?.DATABASE_URL ||
    (typeof globalThis !== "undefined" &&
      (globalThis as any).DATABASE_URL);
  const authToken =
    env?.DATABASE_API_TOKEN ||
    processEnv?.DATABASE_API_TOKEN ||
    (typeof globalThis !== "undefined" &&
      (globalThis as any).DATABASE_API_TOKEN);

  if (!url) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!authToken) {
    throw new Error("DATABASE_API_TOKEN is required.");
  }

  const client = createClient({ url, authToken });
  dbInstance = drizzle(client);
  return dbInstance;
}

// Auto-initialize for Node.js/Bun (load dotenv first)
if (typeof process !== "undefined" && process.env) {
  // Load dotenv synchronously for Node.js/Bun
  try {
    // Use dynamic import in async context, but for sync init we'll load it at module level
    // In Bun/Node, we can use top-level await or just rely on dotenv being loaded
    if (!process.env.DATABASE_URL) {
      // dotenv will be loaded by the main entry point
      // This is just a fallback
    }
  } catch {
    // Ignore
  }
  // Will be initialized when db is first accessed
}

// Export getter that initializes if needed
export const db = new Proxy({} as LibSQLDatabase<typeof schema>, {
  get(_target, prop) {
    if (!dbInstance) {
      dbInstance = initDb();
    }
    return (dbInstance as any)[prop];
  },
});
