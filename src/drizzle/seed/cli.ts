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

/**
 * Every seed command writes, so the resolved target is printed before anything
 * runs — the failure mode this repo has already hit is a "local" seed silently
 * landing in production.
 */
function describeTarget() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return null;

  try {
    const { hostname, port, pathname } = new URL(rawUrl);
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
    return { hostname, port, pathname, isLocal };
  } catch {
    return null;
  }
}

/**
 * The default admin password is a well-known constant in this repo. Putting it
 * on a remote database would hand out an admin account to anyone who has read
 * the source, so a remote target must supply its own.
 */
function assertAdminPasswordIsSafe(target: ReturnType<typeof describeTarget>) {
  if (!target || target.isLocal) return;
  if (process.env.SEED_ADMIN_PASSWORD) return;

  console.error(
    "❌ Refusing to seed the built-in admin password into a remote database.\n" +
      "   Set SEED_ADMIN_PASSWORD (and optionally SEED_ADMIN_EMAIL) and run again.",
  );
  process.exit(1);
}

const commands = {
  settings: {
    description:
      "Upsert default settings rows only (does not clear the database).",
    action: async () => {
      const { runSeedProfile } = await import("@/drizzle/seed");
      await runSeedProfile("settings");
    },
  },
  admin: {
    description:
      "Create the admin account only — no branches or sample data, clears nothing.",
    action: async () => {
      assertAdminPasswordIsSafe(describeTarget());
      const { runSeedProfile } = await import("@/drizzle/seed");
      await runSeedProfile("admin");
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
  console.log("  npm run seed:admin");
  console.log("  npm run seed -- demo");
  console.log("  npm run seed -- baseline");
  console.log("  npm run seed -- performance");
  console.log("  npm run seed:all");
  console.log("  npm run seed:clear");
  console.log("\nSeeding a remote database (targets .env.prod explicitly):");
  console.log(
    "  DOTENV_CONFIG_PATH=.env.prod SEED_ADMIN_EMAIL=you@example.com \\",
  );
  console.log(
    "    SEED_ADMIN_PASSWORD='<a strong password>' npm run seed:admin",
  );
  console.log("\nEnvironment variables:");
  console.log(
    "  SEED_ADMIN_EMAIL           Admin email (default: the built-in seed address)",
  );
  console.log(
    "  SEED_ADMIN_PASSWORD        Required for any non-localhost target",
  );
  console.log(
    "  SEED_ADMIN_RESET_PASSWORD  Set to 1 to rotate an existing admin password",
  );
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
  const target = describeTarget();

  if (target) {
    console.log(
      `🎯 Target: ${target.hostname}${target.port ? `:${target.port}` : ""}${target.pathname}${target.isLocal ? "" : "  ← REMOTE"}`,
    );
  }

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
