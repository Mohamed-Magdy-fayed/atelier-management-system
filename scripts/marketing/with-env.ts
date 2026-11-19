import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

/**
 * Runs a command against the isolated marketing stack and nothing else.
 *
 * `.env` and `.env.local` in this repo point at the PRODUCTION database, and
 * both Next.js and the seed CLI load them on their own. Neither overwrites a
 * variable that is already set, so this launcher sets every variable those
 * files define: the marketing value where `.env.marketing.local` has one, an
 * empty string (read as "unset" by `src/env/server.ts`) everywhere else. A
 * production SMTP password, WhatsApp token or database URL therefore cannot leak
 * into a screenshot run.
 *
 * Usage: tsx scripts/marketing/with-env.ts <command> [args...]
 */

const MARKETING_ENV = ".env.marketing.local";
const INHERITED_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
];
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const EXPECTED_PORT = "5433";
const EXPECTED_DATABASE = "atelier_marketing";

function readEnvFile(file: string): Record<string, string> {
  const fullPath = path.resolve(process.cwd(), file);
  if (!existsSync(fullPath)) return {};
  return parse(readFileSync(fullPath));
}

function assertMarketingDatabase(rawUrl: string | undefined): URL {
  if (!rawUrl) {
    throw new Error(`${MARKETING_ENV} has no DATABASE_URL.`);
  }
  const url = new URL(rawUrl);
  const database = url.pathname.replace(/^\//, "");
  if (
    !LOCAL_HOSTS.has(url.hostname) ||
    url.port !== EXPECTED_PORT ||
    database !== EXPECTED_DATABASE
  ) {
    throw new Error(
      `Refusing to run: DATABASE_URL is ${url.hostname}:${url.port}/${database}, ` +
        `expected localhost:${EXPECTED_PORT}/${EXPECTED_DATABASE}.`,
    );
  }
  return url;
}

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command) {
    throw new Error(
      "Usage: tsx scripts/marketing/with-env.ts <command> [args...]",
    );
  }

  const marketing = readEnvFile(MARKETING_ENV);
  if (Object.keys(marketing).length === 0) {
    throw new Error(`${MARKETING_ENV} is missing or empty.`);
  }
  const target = assertMarketingDatabase(marketing.DATABASE_URL);

  const inheritedKeys = new Set(
    INHERITED_ENV_FILES.flatMap((file) => Object.keys(readEnvFile(file))),
  );

  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of inheritedKeys) env[key] = "";
  Object.assign(env, marketing, {
    // The seed CLI loads this file instead of `.env.local` / `.env`.
    DOTENV_CONFIG_PATH: MARKETING_ENV,
  });

  console.info(
    "▶ marketing env → %s:%s%s (%d inherited variables blanked)",
    target.hostname,
    target.port,
    target.pathname,
    [...inheritedKeys].filter((key) => !(key in marketing)).length,
  );

  const child = spawn(command, args, { env, stdio: "inherit", shell: true });
  child.on("exit", (code) => process.exit(code ?? 1));
}

main();
