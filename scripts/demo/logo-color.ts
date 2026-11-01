/**
 * Samples a brand colour from a logo: `npm run demo:logo-color -- <file|https URL>`.
 *
 * Prints `#RRGGBB` on stdout, or nothing (exit 2) when the logo has no
 * colour worth using — an all-black or all-white mark — in which case the demo
 * keeps the bundled palette.
 *
 * Method: shrink to 64×64, drop transparent, near-white, near-black and grey
 * pixels, bucket the rest by hue, and take the most populated hue bucket,
 * weighted by saturation so a large dull area does not beat the actual brand
 * colour. The answer is the average of that bucket's pixels.
 */
import { readFile } from "node:fs/promises";

import sharp from "sharp";

const SAMPLE_SIZE = 64;
const HUE_BUCKETS = 24;
/** Below this HSV saturation a pixel reads as grey. */
const MIN_SATURATION = 0.25;
/** HSV value band outside which a pixel reads as black or white. */
const MIN_VALUE = 0.15;
const MAX_VALUE = 0.97;
/** A hue bucket must cover this share of coloured pixels to count. */
const MIN_BUCKET_SHARE = 0.05;

type Bucket = { weight: number; r: number; g: number; b: number; n: number };

async function loadImage(source: string): Promise<Buffer> {
  if (/^https:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Could not fetch ${source}: HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  return readFile(source);
}

function toHsv(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return {
    hue: (hue * 60 + 360) % 360,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

export async function sampleBrandColor(source: string): Promise<string | null> {
  const { data } = await sharp(await loadImage(source))
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets: Bucket[] = Array.from({ length: HUE_BUCKETS }, () => ({
    weight: 0,
    r: 0,
    g: 0,
    b: 0,
    n: 0,
  }));
  let colouredPixels = 0;

  for (let offset = 0; offset < data.length; offset += 4) {
    const [r, g, b, alpha] = [
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3],
    ];
    if (alpha < 128) continue;

    const { hue, saturation, value } = toHsv(r / 255, g / 255, b / 255);
    if (saturation < MIN_SATURATION) continue;
    if (value < MIN_VALUE || value > MAX_VALUE) continue;

    const bucket = buckets[Math.floor(hue / (360 / HUE_BUCKETS)) % HUE_BUCKETS];
    bucket.weight += saturation;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    colouredPixels += 1;
  }

  const best = buckets.reduce((top, bucket) =>
    bucket.weight > top.weight ? bucket : top,
  );
  if (best.n === 0 || best.n / colouredPixels < MIN_BUCKET_SHARE) return null;

  const hex = [best.r, best.g, best.b]
    .map((sum) => Math.round(sum / best.n).toString(16).padStart(2, "0"))
    .join("");
  return `#${hex}`;
}

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error("Usage: npm run demo:logo-color -- <logo file or https URL>");
    process.exit(1);
  }

  const color = await sampleBrandColor(source);
  if (!color) {
    console.error("No usable brand colour in this logo — keep the bundled palette.");
    process.exit(2);
  }
  console.log(color);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
