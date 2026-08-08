import path from "node:path";

import { config as loadEnv } from "dotenv";

/**
 * Match the env precedence Next.js uses, so a seed run targets whatever
 * database the dev server is reading.
 *
 * Loading only `.env` meant `npm run seed` wrote to whatever `.env` points at
 * while the app read `.env.local` — on this repo those are the production Neon
 * database and a local Postgres respectively, so a "local" seed silently hit
 * production and never showed up on localhost.
 *
 * dotenv does not overwrite a variable that is already set, so the first file
 * loaded wins: `.env.local` ahead of `.env` gives it precedence. A missing file
 * is a no-op. Set DOTENV_CONFIG_PATH to target one file explicitly — that is
 * the intended way to seed production (`DOTENV_CONFIG_PATH=.env.prod`).
 */
const explicitEnvPath = process.env.DOTENV_CONFIG_PATH;
if (explicitEnvPath) {
  loadEnv({ path: explicitEnvPath });
} else {
  for (const file of [".env.local", ".env"]) {
    loadEnv({ path: path.resolve(process.cwd(), file) });
  }
}

const commands = {
  settings: {
    description: "Upsert default settings rows only (does not clear the database).",
    action: async () => {
      const { runSeedProfile } = await import("@/drizzle/seed");
      await runSeedProfile("settings");
    },
  },
  all: {
    description: 'Legacy alias for the "settings" seed profile.',
    action: async () => {
      const { runSeedProfile } = await import("@/drizzle/seed");
      await runSeedProfile("settings");
    },
  },
  baseline: {
    description: "Reset and seed a minimal local bootstrap profile.",
    action: async () => {
      const { runSeedProfile } = await import("@/drizzle/seed");
      await runSeedProfile("baseline");
    },
  },
  demo: {
    description: "Reset and seed a curated demo profile.",
    action: async () => {
      const { runSeedProfile } = await import("@/drizzle/seed");
      await runSeedProfile("demo");
    },
  },
  performance: {
    description:
      "Reset and seed a large dataset for table and query stress tests.",
    action: async () => {
      const { runSeedProfile } = await import("@/drizzle/seed");
      await runSeedProfile("performance");
    },
  },
  clear: {
    description: "Clear all data from the database tables.",
    action: async () => {
      const { clearDb } = await import("@/drizzle/seed/clear-db");
      await clearDb();
    },
  },
  help: {
    description: "Show this help message.",
    action: async () => {
      printHelp();
    },
  },
} as const;

type CommandName = keyof typeof commands;

function printHelp() {
  const entries = Object.entries(commands).filter(([name]) => name !== "help");
  console.log("Usage: npm run seed -- <command>\n");
  console.log("Commands:");
  for (const [name, info] of entries) {
    console.log(`  ${name.padEnd(12)} ${info.description}`);
  }
  console.log("\nExamples:");
  console.log("  npm run seed");
  console.log("  npm run seed -- settings");
  console.log("  npm run seed -- demo");
  console.log("  npm run seed -- baseline");
  console.log("  npm run seed -- performance");
  console.log("  npm run seed:all");
  console.log("  npm run seed:clear");
}

async function run() {
  const rawArg = process.argv[2]?.toLowerCase() as CommandName | undefined;
  const commandName: CommandName =
    rawArg && rawArg in commands ? rawArg : "settings";

  if (commandName === "help") {
    printHelp();
    return;
  }

  const command = commands[commandName];
  console.log(`➡️  Running seed command: ${commandName}...`);

  let closeDbConnection: (() => Promise<void>) | undefined;
  try {
    ({ closeDbConnection } = await import("@/drizzle"));
    await command.action();
    console.log("✅ Seed completed successfully.");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  } finally {
    if (closeDbConnection) {
      await closeDbConnection().catch((err) => {
        console.error("⚠️  Failed to close database connection:", err);
      });
    }
  }
}

run().catch((error) => {
  console.error("❌ Unexpected error while running seed command:", error);
  process.exit(1);
});
