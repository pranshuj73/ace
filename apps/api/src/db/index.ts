import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { config } from "dotenv";

config();

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_API_TOKEN;

if (!url) {
  throw new Error("DATABASE_URL is required.");
}

if (!authToken) {
  throw new Error("DATABASE_API_TOKEN is required.");
}

const client = createClient({ url, authToken });

export const db = drizzle(client);
