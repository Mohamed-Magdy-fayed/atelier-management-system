import path from "node:path";

import { config as loadEnv } from "dotenv";
import type { Config } from "drizzle-kit";

/**
 * Match the env precedence Next.js and the seed CLI use, so a migration targets
 * whatever database the dev server is reading.
 *
 * drizzle-kit loads only `.env`, which on this repo is the production Neon
 * database while the app reads `.env.local` — so `npm run db:migrate` would
 * migrate production from a laptop with no warning. Same failure the seed CLI
 * already had fixed (see src/drizzle/seed/cli.ts).
 *
 * dotenv does not overwrite a variable that is already set, so the first file
 * loaded wins: `.env.local` ahead of `.env` gives it precedence, and on Vercel
 * neither file exists so the platform's own environment is used untouched. Set
 * DOTENV_CONFIG_PATH to target one file explicitly — that is the intended way
 * to migrate production by hand (`DOTENV_CONFIG_PATH=.env.prod`).
 */
const explicitEnvPath = process.env.DOTENV_CONFIG_PATH;
if (explicitEnvPath) {
  loadEnv({ path: explicitEnvPath });
} else {
  for (const file of [".env.local", ".env"]) {
    loadEnv({ path: path.resolve(process.cwd(), file) });
  }
}

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Migrations write, so the resolved target is announced before drizzle-kit runs.
try {
  const { hostname, port, pathname } = new URL(databaseUrl);
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  console.log(
    `🎯 drizzle target: ${hostname}${port ? `:${port}` : ""}${pathname}${isLocal ? "" : "  ← REMOTE"}`,
  );
} catch {
  console.warn("⚠️  Could not parse DATABASE_URL to report the target.");
}

export default {
  schema: "./src/drizzle/schema.ts",
  dialect: "postgresql",
  out: "./src/drizzle/migrations",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
