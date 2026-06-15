import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// On serverless (Vercel), keep one connection per instance and disable prepared
// statements — required when connecting through a transaction pooler such as
// Neon's `-pooler` endpoint (PgBouncer). Locally, use a normal small pool.
const isServerless = !!process.env.VERCEL;

// Reuse the client across hot reloads in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as { __avisoSql?: ReturnType<typeof postgres> };
const client =
  globalForDb.__avisoSql ??
  postgres(connectionString, isServerless ? { max: 1, prepare: false } : { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.__avisoSql = client;

export const db = drizzle(client, { schema });
export { schema };
