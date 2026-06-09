import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/drizzle";
import { ReservationsTable, UsersTable } from "@/drizzle/schema";
import { uploadImage } from "@/integrations/firebase/storage";
import { normalizePhoneKey } from "@/lib/phone";

import { getCustomerIdsForUser } from "./queries";

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
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Reservation not found",
    });
  }

  const photoUrl = await uploadImage(
    input.base64,
    input.mimeType,
    "reservations",
  );

  await db
    .update(ReservationsTable)
    .set({ customerPhotoUrl: photoUrl })
    .where(eq(ReservationsTable.id, input.reservationId));

  return { url: photoUrl };
}
