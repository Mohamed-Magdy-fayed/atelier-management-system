import "dotenv/config";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const target = new URL(databaseUrl);
const dbName = decodeURIComponent(target.pathname.slice(1));
const adminUrl = new URL(databaseUrl);
adminUrl.pathname = "/postgres";

async function main() {
  const sql = postgres(adminUrl.toString(), { max: 1 });

  try {
    const exists = await sql<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM pg_database WHERE datname = ${dbName}
      ) AS exists
    `;

    if (exists[0]?.exists) {
      console.log(`Database "${dbName}" already exists.`);
    } else {
      await sql.unsafe(`CREATE DATABASE "${dbName.replace(/"/g, "")}"`);
      console.log(`Created database "${dbName}".`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
