import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/lib/db/schema";

const globalForDatabase = globalThis as unknown as { devforgePool?: Pool };

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = globalForDatabase.devforgePool ?? new Pool({ connectionString });
  globalForDatabase.devforgePool = pool;

  return drizzle(pool, { schema });
}

export async function verifyDatabaseConnection() {
  await getDatabase().execute(sql`select 1`);
}
