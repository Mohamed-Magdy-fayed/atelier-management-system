/**
 * Tripwire for `npm run db:push`.
 *
 * `drizzle-kit push` rewrites the live schema to match schema.ts with no
 * migration file and no history. This repo's `.env` points at production, so a
 * bare `npm run db:push` from a laptop would do that to production. Use
 * `db:migrate` for any shared database; `push` is for throwaway local ones.
 *
 * Resolves the target exactly as drizzle.config.ts does (same env precedence),
 * then refuses unless the host is local. Hosts listed in PRODUCTION_DB_HOSTS
 * (comma separated) are refused even with the override.
 *
 * Override for a deliberate remote scratch database: ALLOW_REMOTE_DB_PUSH=1.
 */
import path from "node:path";
import { config as loadEnv } from "dotenv";

const explicit = process.env.DOTENV_CONFIG_PATH;
if (explicit) {
  loadEnv({ path: explicit, quiet: true });
} else {
  for (const f of [".env.local", ".env"]) {
    loadEnv({ path: path.resolve(process.cwd(), f), quiet: true });
  }
}

const url =
  process.env.DATABASE_URL ??
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

let host;
try {
  host = new URL(url).hostname;
} catch {
  console.error("db:push refused: could not parse the database URL.");
  process.exit(1);
}

const isLocal = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
const prodHosts = (process.env.PRODUCTION_DB_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

if (prodHosts.includes(host)) {
  console.error(`db:push refused: ${host} is listed in PRODUCTION_DB_HOSTS.`);
  process.exit(1);
}

if (!isLocal && process.env.ALLOW_REMOTE_DB_PUSH !== "1") {
  console.error(
    `db:push refused: target ${host} is not local.\n` +
      "push has no migration history. Use `npm run db:migrate` for shared databases,\n" +
      "or set ALLOW_REMOTE_DB_PUSH=1 for a deliberate scratch database.",
  );
  process.exit(1);
}
