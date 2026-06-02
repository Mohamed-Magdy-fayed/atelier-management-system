import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { exportPayments, listPayments } from "./queries";
import { exportPaymentsInput, listPaymentsInput } from "./schemas";

export const paymentsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listPaymentsInput)
    .query(async ({ ctx, input }) => listPayments(ctx, input)),
  exportRows: protectedProcedure
    .input(exportPaymentsInput)
    .query(async ({ ctx, input }) => exportPayments(ctx, input)),
});
