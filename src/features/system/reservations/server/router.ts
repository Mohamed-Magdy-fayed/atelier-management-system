import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import {
  collectReservationPayment,
  createReservation,
  deleteReservation,
  generateReservationCodeForBranch,
  updateReservation,
  updateReservationStatus,
} from "./mutations";
import {
  exportReservations,
  getReservationById,
  getReservationFormData,
  listReservations,
} from "./queries";
import {
  exportReservationsInput,
  listReservationsInput,
  reservationByIdSchema,
  reservationCollectPaymentSchema,
  reservationDeleteSchema,
  reservationFormDataSchema,
  reservationGenerateCodeSchema,
  reservationMutationSchema,
  reservationUpdateSchema,
  reservationUpdateStatusSchema,
} from "./schemas";

export const reservationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listReservationsInput)
    .query(async ({ ctx, input }) => listReservations(ctx, input)),
  exportRows: protectedProcedure
    .input(exportReservationsInput)
    .query(async ({ ctx, input }) => exportReservations(ctx, input)),
  getById: protectedProcedure
    .input(reservationByIdSchema)
    .query(async ({ ctx, input }) => getReservationById(ctx, input)),
  formData: protectedProcedure
    .input(reservationFormDataSchema)
    .query(async ({ ctx, input }) => getReservationFormData(ctx, input)),
  generateCode: protectedProcedure
    .input(reservationGenerateCodeSchema)
    .mutation(async ({ ctx, input }) =>
      generateReservationCodeForBranch(ctx, input),
    ),
  create: protectedProcedure
    .input(reservationMutationSchema)
    .mutation(async ({ ctx, input }) => createReservation(ctx, input)),
  update: protectedProcedure
    .input(reservationUpdateSchema)
    .mutation(async ({ ctx, input }) => updateReservation(ctx, input)),
  updateStatus: protectedProcedure
    .input(reservationUpdateStatusSchema)
    .mutation(async ({ ctx, input }) => updateReservationStatus(ctx, input)),
  collectPayment: protectedProcedure
    .input(reservationCollectPaymentSchema)
    .mutation(async ({ ctx, input }) => collectReservationPayment(ctx, input)),
  delete: protectedProcedure
    .input(reservationDeleteSchema)
    .mutation(async ({ ctx, input }) => deleteReservation(ctx, input)),
});
