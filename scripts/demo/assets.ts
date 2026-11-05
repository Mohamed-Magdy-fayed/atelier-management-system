/**
 * Copies a demo's images into our Firebase bucket, and removes them on teardown.
 *
 *   npm run demo:assets -- upload <slug> <name> <https URL | file>   → prints the public URL
 *   npm run demo:assets -- delete <slug>                             → removes demos/<slug>/
 *
 * Why copy at all: Instagram and Facebook image links are signed and expire
 * within days, and `next/image` only serves `storage.googleapis.com/<bucket>`.
 * Every image is re-encoded to WebP and capped at 1600px, which also strips
 * whatever metadata the original carried.
 *
 * Reads only the FIREBASE_* variables, from DOTENV_CONFIG_PATH or
 * `.env.local` then `.env` — the same precedence as the seed CLI. The bucket
 * must be the one the demo deployment's FIREBASE_STORAGE_BUCKET names.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { config as loadEnv } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import sharp from "sharp";

const MAX_EDGE = 1_600;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const NAME = /^[a-z0-9-]{1,40}$/;
/** How far from the corner colour a pixel must be to count as logo, not margin. */
const LOGO_TRIM_THRESHOLD = 60;
const LOGO_PADDING = 24;

function loadFirebaseEnv() {
  const explicit = process.env.DOTENV_CONFIG_PATH;
  if (explicit) {
    loadEnv({ path: explicit, quiet: true });
  } else {
    for (const file of [".env.local", ".env"]) {
      loadEnv({ path: path.resolve(process.cwd(), file), quiet: true });
    }
  }

  const required = [
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "FIREBASE_STORAGE_BUCKET",
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.join(", ")}`);
  }

  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "")
        .replace(/\\n/g, "\n")
        .replace(/\r/g, ""),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  return getStorage(app).bucket();
}

async function readSource(source: string): Promise<Buffer> {
  if (!/^https:\/\//i.test(source)) return readFile(source);

  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`Could not fetch ${source}: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_SOURCE_BYTES) {
    throw new Error(`${source} is larger than ${MAX_SOURCE_BYTES} bytes`);
  }
  return buffer;
}

/**
 * A logo is shown at ~48px in a square slot that stretches what it is given.
 * Profile pictures put the mark in the middle of a wide margin, which at that
 * size leaves the lettering unreadable — so trim the margin, then pad back to
 * a square in the image's own corner colour.
 */
async function squareLogo(image: sharp.Sharp): Promise<sharp.Sharp> {
  const { data: corner } = await image
    .clone()
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data, info } = await image
    .trim({ threshold: LOGO_TRIM_THRESHOLD })
    .toBuffer({ resolveWithObject: true });
  const side = Math.max(info.width, info.height) + 2 * LOGO_PADDING;
  const padX = side - info.width;
  const padY = side - info.height;
  return sharp(data).extend({
    top: Math.floor(padY / 2),
    bottom: Math.ceil(padY / 2),
    left: Math.floor(padX / 2),
    right: Math.ceil(padX / 2),
    background: { r: corner[0], g: corner[1], b: corner[2] },
  });
}

async function upload(slug: string, name: string, source: string) {
  if (!SLUG.test(slug)) throw new Error(`Invalid slug "${slug}"`);
  if (!NAME.test(name)) throw new Error(`Invalid asset name "${name}"`);

  // Decoding through sharp is also the content check: anything that is not
  // an image fails here instead of being stored.
  const decoded = sharp(await readSource(source)).rotate();
  const prepared = name.startsWith("logo") ? await squareLogo(decoded) : decoded;
  const webp = await prepared
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  const bucket = loadFirebaseEnv();
  const file = bucket.file(`demos/${slug}/${name}.webp`);
  await file.save(webp, {
    metadata: { contentType: "image/webp", cacheControl: "public, max-age=86400" },
    public: true,
  });
  console.log(file.publicUrl());
}

async function remove(slug: string) {
  if (!SLUG.test(slug)) throw new Error(`Invalid slug "${slug}"`);

  const bucket = loadFirebaseEnv();
  const prefix = `demos/${slug}/`;
  const [files] = await bucket.getFiles({ prefix });
  await Promise.all(files.map((file) => file.delete()));
  console.log(`Deleted ${files.length} file(s) under ${prefix}`);
}

async function main() {
  const [command, slug, name, source] = process.argv.slice(2);

  if (command === "upload" && slug && name && source) {
    await upload(slug, name, source);
    return;
  }
  if (command === "delete" && slug) {
    await remove(slug);
    return;
  }

  console.error(
    "Usage:\n  npm run demo:assets -- upload <slug> <name> <https URL | file>\n  npm run demo:assets -- delete <slug>",
  );
  process.exit(1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
