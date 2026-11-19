import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  LAMSA_DRESSES,
  lamsaDressImagePath,
} from "@/drizzle/seed/marketing/fixtures";

/**
 * Fetches the Lamsa dress photos from the Unsplash CDN into `public/`.
 *
 * The files are gitignored (stock photos are not ours to redistribute in the
 * repo), so a fresh checkout runs this once before `marketing:seed`. Every
 * photo is under the free Unsplash License; sources and photographers are
 * listed in marketing/credits.md. Existing files are left alone.
 */
async function main() {
  for (const dress of LAMSA_DRESSES) {
    const target = path.join(
      process.cwd(),
      "public",
      lamsaDressImagePath(dress.rank),
    );
    if (existsSync(target)) continue;

    const response = await fetch(
      `${dress.photo.cdnUrl}?w=1000&q=80&fm=jpg&fit=max`,
    );
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !type.startsWith("image/")) {
      throw new Error(
        `${dress.photo.unsplashId}: HTTP ${response.status} (${type})`,
      );
    }

    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    console.info("✓ %s ← %s", path.basename(target), dress.photo.unsplashId);
  }
  console.info("Dress photos ready in public/marketing/dresses/.");
}

main().catch((error: unknown) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
