import { AREAS } from "./areas";
import { PROBLEMS } from "./problems";
import { TEMPLATES } from "./templates";
import type { PseoFamily, PseoRow } from "./types";

export const ALL_ROWS: PseoRow[] = [...AREAS, ...PROBLEMS, ...TEMPLATES];

/**
 * Drafts render only when `PSEO_PREVIEW=1` (a preview deployment), and then
 * with noindex. In production only `published: true` rows exist.
 */
export const previewEnabled = () => process.env.PSEO_PREVIEW === "1";

export function visibleRows(family?: PseoFamily): PseoRow[] {
  return ALL_ROWS.filter(
    (r) =>
      (!family || r.family === family) && (r.published || previewEnabled()),
  );
}

export const getRow = (family: PseoFamily, slug: string) =>
  visibleRows(family).find((r) => r.slug === slug);

export const publishedRows = () => ALL_ROWS.filter((r) => r.published);
