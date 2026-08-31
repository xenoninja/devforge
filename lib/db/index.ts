import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDatabase = globalThis as unknown as { devforgePool?: Pool };

export async function verifyDatabaseConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = globalForDatabase.devforgePool ?? new Pool({ connectionString });
  globalForDatabase.devforgePool = pool;

  await drizzle(pool).execute(sql`select 1`);
}
