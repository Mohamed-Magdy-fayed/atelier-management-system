import { sql } from "drizzle-orm";

import { db } from "@/drizzle";
import { env } from "@/env/server";

const SAFE_DB_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "db",
  "postgres",
  "postgresql",
  "host.docker.internal",
]);

function getDatabaseHostname(): string {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before clearing the database.");
  }

  try {
    return new URL(databaseUrl).hostname.toLowerCase();
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }
}

function assertSafeToClearDb() {
  const hostname = getDatabaseHostname();
  const allowRemote = process.env.SEED_ALLOW_REMOTE === "1";

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to clear the database in production.");
  }

  if (!allowRemote && !SAFE_DB_HOSTS.has(hostname)) {
    throw new Error(
      `Refusing to clear a non-local database host (${hostname}). Set SEED_ALLOW_REMOTE=1 to override.`,
    );
  }
}

export async function clearDb() {
    assertSafeToClearDb();
    console.log("🗑️ Emptying all data tables");

    const tablesSchema = db._.schema;
    if (!tablesSchema) throw new Error("Schema not loaded");

    const tableNames = Object.values(tablesSchema)
        .map((t) => t.dbName)
        .filter(Boolean);
    if (tableNames.length === 0) {
        console.log("⚠️ No tables found in schema, nothing to truncate");
        return;
    }

    const quoteIdent = (s: string) => `"${s.replace(/"/g, '""')}"`;
    console.log("🛜 Sending cleanup query (truncate)");

    await db.transaction(async (trx) => {
        for (const tableName of tableNames) {
            try {
                const existsResult: any = await trx.execute(
                    sql.raw(`SELECT to_regclass('public.${tableName}') AS regclass;`),
                );

                const existsRows = existsResult.rows ?? existsResult;
                const exists = Array.isArray(existsRows) && existsRows[0]?.regclass;
                if (!exists) continue;

                const truncateSql = `TRUNCATE TABLE ${quoteIdent(tableName)} RESTART IDENTITY CASCADE;`;
                await trx.execute(sql.raw(truncateSql));
            } catch (err) {
                console.warn(`⚠️ Skipping table ${tableName}:`, err);
            }
        }
    });

    console.log("✅ Database cleanup complete");
}
