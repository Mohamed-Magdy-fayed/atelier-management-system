import { readFile } from "node:fs/promises";

import { z } from "zod";

import {
  isHexColor,
  isSupportedLogoUrl,
} from "@/features/system/settings/lib/branding";

import { DEMO_BRANCHES } from "../demo/fixtures";

/**
 * Exactly six: the client's own best-performing dresses, which take ranks 0–5
 * of the main branch — the most-booked slots on the dashboard and catalogue.
 */
export const CLIENT_DEMO_DRESS_COUNT = 6;

/**
 * Images must already be copied to our Firebase bucket. Social-media CDN links
 * are signed and expire within days, and `next/image` only serves this host.
 */
const firebaseImageUrl = z
  .string()
  .refine(isSupportedLogoUrl, "Must be an https://storage.googleapis.com URL");

const clientDemoDressSchema = z.object({
  title: z.string().trim().min(1).max(255),
  color: z.string().trim().min(1).max(64),
  description: z.string().trim().max(2_000).optional(),
  imageUrl: firebaseImageUrl,
  /** Where the photo came from, kept for the record — not written to the DB. */
  sourcePost: z.url().optional(),
});

/**
 * The single input to a client demo — see `docs/client-demos/PLAN.md` §4.
 *
 * Only the business's public identity and its own dress photos come from the
 * prospect. Customers, staff and phone numbers stay the synthetic ones the
 * `demo` profile generates.
 */
export const clientDemoManifestSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(40),
  leadId: z.string().optional(),
  nameEn: z.string().trim().min(1).max(128),
  nameAr: z.string().trim().min(1).max(128),
  logoUrl: firebaseImageUrl,
  brandColor: z
    .string()
    .refine(isHexColor, "Must be a #RRGGBB hex colour")
    .nullable()
    .optional(),
  /**
   * Renames the demo branches in order. The portfolio keeps its full size
   * either way; branches beyond this list keep their generic names.
   */
  branches: z
    .array(
      z.object({
        nameEn: z.string().trim().min(1).max(128),
        nameAr: z.string().trim().min(1).max(128),
      }),
    )
    .max(DEMO_BRANCHES.length)
    .default([]),
  dresses: z.array(clientDemoDressSchema).length(CLIENT_DEMO_DRESS_COUNT),
  adminEmail: z.email(),
  expiresAt: z.iso.date(),
});

export type ClientDemoManifest = z.infer<typeof clientDemoManifestSchema>;

export async function loadClientDemoManifest(
  path: string,
): Promise<ClientDemoManifest> {
  const raw: unknown = JSON.parse(await readFile(path, "utf8"));
  const parsed = clientDemoManifestSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `Invalid demo manifest ${path}:\n${z.prettifyError(parsed.error)}`,
    );
  }

  return parsed.data;
}
