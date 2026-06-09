import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/drizzle";
import { ReservationsTable, UsersTable } from "@/drizzle/schema";
import { normalizePhoneKey } from "@/lib/phone";

import { getCustomerIdsForUser } from "./queries";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export const uploadReservationPhotoInput = z.object({
  reservationId: z.string().uuid(),
  fileName: z.string().min(1),
  mimeType: z.string().startsWith("image/"),
  base64: z.string().min(1),
});

export async function uploadReservationPhoto(
  userId: string,
  input: z.infer<typeof uploadReservationPhotoInput>,
) {
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported image type" });
  }

  const user = await db.query.UsersTable.findFirst({
    columns: { phone: true },
    where: eq(UsersTable.id, userId),
  });

  const phoneKey = normalizePhoneKey(user?.phone);
  const customerIds = await getCustomerIdsForUser(userId, phoneKey);

  const reservation = await db.query.ReservationsTable.findFirst({
    columns: { id: true, customerId: true },
    where: eq(ReservationsTable.id, input.reservationId),
  });

  if (!reservation || !customerIds.includes(reservation.customerId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Reservation not found" });
  }

  const buffer = Buffer.from(input.base64, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Image exceeds the maximum allowed size" });
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "images");
  await mkdir(uploadsDir, { recursive: true });

  const ext = EXTENSION_BY_MIME[input.mimeType] ?? ".jpg";
  const safeName = `${Date.now()}-${randomUUID()}${ext}`;
  const outputPath = path.join(uploadsDir, safeName);
  await writeFile(outputPath, buffer);

  const photoUrl = `/images/${safeName}`;

  await db
    .update(ReservationsTable)
    .set({ customerPhotoUrl: photoUrl })
    .where(eq(ReservationsTable.id, input.reservationId));

  return { url: photoUrl };
}
