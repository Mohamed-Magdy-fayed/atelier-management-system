/**
 * Per-client Vercel wiring for demos, on the `atelier-demos` project.
 *
 *   DEMO_DATABASE_URL='<pooled URL>' npm run demo:vercel -- attach <slug>
 *   npm run demo:vercel -- detach <slug>
 *
 * `attach` adds the four branch-scoped Preview variables for `demos/<slug>` and
 * assigns `<slug>-atelier.gateling.com` to that branch. `detach` removes both.
 *
 * Runs through the Vercel CLI's own login (`npx vercel@latest api`): the
 * Vercel MCP connector here may read projects but is refused every project
 * write. The database URL is read from the environment, never from argv, so
 * it does not appear in shell history or process listings; request bodies go
 * through a temp file that is emptied and removed after each call.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const TEAM = "teamId=team_ryMxulGwt0iEF16elv0QXSLO";
const PROJECT = "atelier-demos";
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type EnvRow = { id: string; key: string; gitBranch?: string };

const workDir = mkdtempSync(path.join(tmpdir(), "demo-vercel-"));
const bodyFile = path.join(workDir, "body.json");

function vercelApi(endpoint: string, method: string, body?: object): unknown {
  const args = ["-y", "vercel@latest", "api", `"${endpoint}"`, "-X", method, "--raw"];
  if (body) {
    writeFileSync(bodyFile, JSON.stringify(body), { mode: 0o600 });
    args.push("--input", `"${bodyFile}"`);
  }
  if (method === "DELETE") args.push("--dangerously-skip-permissions");

  try {
    // `shell` because npx is a .cmd shim on Windows; every argument above is
    // either a constant or validated (slug), and the endpoint is quoted.
    const raw = execFileSync("npx", args, {
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1 << 26,
    });
    return raw.trim() ? JSON.parse(raw) : null;
  } catch (error) {
    const stderr =
      error && typeof error === "object" && "stderr" in error
        ? String(error.stderr).replace(/<claude-code-hint[^>]*>/g, "").trim()
        : "";
    throw new Error(`${method} ${endpoint.split("?")[0]} failed: ${stderr.slice(0, 300)}`);
  } finally {
    if (body) writeFileSync(bodyFile, "");
  }
}

const branchOf = (slug: string) => `demos/${slug}`;
const domainOf = (slug: string) => `${slug}-atelier.gateling.com`;

function attach(slug: string) {
  const databaseUrl = process.env.DEMO_DATABASE_URL;
  if (!databaseUrl?.startsWith("postgres")) {
    throw new Error("Set DEMO_DATABASE_URL to the demo's pooled Neon connection string.");
  }

  const gitBranch = branchOf(slug);
  const origin = `https://${domainOf(slug)}`;
  const vars = [
    { key: "DATABASE_URL", value: databaseUrl, type: "encrypted" },
    { key: "BASE_URL", value: origin, type: "plain" },
    { key: "OAUTH_REDIRECT_URL_BASE", value: origin, type: "plain" },
    { key: "REDIS_KEY_PREFIX", value: `demo:${slug}:`, type: "plain" },
  ];

  for (const variable of vars) {
    vercelApi(`/v10/projects/${PROJECT}/env?${TEAM}&upsert=true`, "POST", {
      ...variable,
      target: ["preview"],
      gitBranch,
    });
    console.log(`env ${variable.key} → ${gitBranch}`);
  }

  vercelApi(`/v10/projects/${PROJECT}/domains?${TEAM}`, "POST", {
    name: domainOf(slug),
    gitBranch,
  });
  console.log(`domain ${domainOf(slug)} → ${gitBranch}`);
}

function detach(slug: string) {
  const gitBranch = branchOf(slug);
  const listed = vercelApi(
    `/v10/projects/${PROJECT}/env?${TEAM}&gitBranch=${encodeURIComponent(gitBranch)}`,
    "GET",
  ) as { envs?: EnvRow[] } | null;

  // The API's branch filter also returns unscoped rows; only delete this branch's.
  for (const row of (listed?.envs ?? []).filter((env) => env.gitBranch === gitBranch)) {
    vercelApi(`/v9/projects/${PROJECT}/env/${row.id}?${TEAM}`, "DELETE");
    console.log(`removed env ${row.key} (${gitBranch})`);
  }

  try {
    vercelApi(`/v9/projects/${PROJECT}/domains/${domainOf(slug)}?${TEAM}`, "DELETE");
    console.log(`removed domain ${domainOf(slug)}`);
  } catch (error) {
    console.log(`domain ${domainOf(slug)}: ${error instanceof Error ? error.message : error}`);
  }
}

function main() {
  const [command, slug] = process.argv.slice(2);
  if (!slug || !SLUG.test(slug) || (command !== "attach" && command !== "detach")) {
    console.error("Usage: npm run demo:vercel -- attach|detach <slug>");
    process.exit(1);
  }
  if (command === "attach") attach(slug);
  else detach(slug);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
