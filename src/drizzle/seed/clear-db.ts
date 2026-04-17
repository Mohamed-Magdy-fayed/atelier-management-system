import { sql } from "drizzle-orm";

import { db } from "@/drizzle";

export async function clearDb() {
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
