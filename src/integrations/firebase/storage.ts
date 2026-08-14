import "server-only";

import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { getStorageBucket } from "./admin";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

/**
 * Where a given user's generic uploads live.
 *
 * Per-user rather than one shared `uploads/` folder so that "delete the image
 * I am replacing" can be expressed as a path prefix. The trade is that
 * replacing an image someone else uploaded leaves the old object behind — a
 * storage cost, against a signed-in user otherwise being able to delete any
 * image in the bucket.
 */
export function uploadFolderForUser(userId: string): string {
  return `uploads/${userId}`;
}

export async function uploadImage(
  base64: string,
  mimeType: string,
  folder = "uploads",
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Unsupported image type",
    });
  }

  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Image exceeds the maximum allowed size",
    });
  }

  const extension = EXTENSION_BY_MIME[mimeType] ?? ".jpg";
  const filename = `${folder}/${Date.now()}-${randomUUID()}${extension}`;

  const bucket = getStorageBucket();
  const file = bucket.file(filename);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    public: true,
  });

  return file.publicUrl();
}

/**
 * Deletes an uploaded object, but only within `requiredPathPrefix`.
 *
 * The prefix is required rather than optional because the only caller takes
 * the URL straight from the client: without it, any caller could delete any
 * object in the bucket by naming it. Callers pass their own scope (see
 * `uploadFolderForUser`), so "delete the file I am replacing" still works
 * while "delete someone else's file" does not.
 *
 * A path outside the prefix is ignored rather than raised. The caller is
 * replacing an image either way, and failing that because the previous file
 * belongs elsewhere would break the edit over a leftover object.
 */
export async function deleteImage(
  publicUrl: string,
  requiredPathPrefix: string,
): Promise<void> {
  try {
    const bucket = getStorageBucket();
    const prefix = `https://storage.googleapis.com/${bucket.name}/`;

    if (!publicUrl.startsWith(prefix)) return;

    const filePath = decodeURIComponent(publicUrl.slice(prefix.length));
    if (!filePath.startsWith(requiredPathPrefix)) return;

    await bucket.file(filePath).delete();
  } catch {
    // ignore — file already deleted or URL not from this bucket
  }
}
