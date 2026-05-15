import "dotenv/config";
import postgres from "postgres";

const step = process.argv[2];
const table = process.argv[3];

if (!step || !table) {
  console.error("Usage: tsx reset-step.ts <step-id> <table-name>");
  process.exit(1);
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  try {
    await sql.unsafe(
      `DELETE FROM "_legacy_migration_state" WHERE step = '${step.replace(/'/g, "''")}'`,
    );
    await sql.unsafe(
      `TRUNCATE TABLE "${table.replace(/"/g, "")}" RESTART IDENTITY CASCADE`,
    );
    console.log(`Reset step "${step}" and truncated "${table}".`);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
