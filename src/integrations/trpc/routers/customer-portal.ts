import {
  uploadReservationPhoto,
  uploadReservationPhotoInput,
} from "@/features/customer-portal/server/mutations";
import { createTRPCRouter, protectedProcedure } from "../init";

export const customerPortalRouter = createTRPCRouter({
  uploadReservationPhoto: protectedProcedure
    .input(uploadReservationPhotoInput)
    .mutation(({ ctx, input }) =>
      uploadReservationPhoto(ctx.session.user.id, input),
    ),
});
