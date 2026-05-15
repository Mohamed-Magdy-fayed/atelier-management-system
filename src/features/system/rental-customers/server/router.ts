import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { exportRentalCustomers, listRentalCustomers } from "./queries";
import {
  exportRentalCustomersInput,
  listRentalCustomersInput,
} from "./schemas";

export const rentalCustomersRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listRentalCustomersInput)
    .query(async ({ ctx, input }) => listRentalCustomers(ctx, input)),
  exportRows: protectedProcedure
    .input(exportRentalCustomersInput)
    .query(async ({ ctx, input }) => exportRentalCustomers(ctx, input)),
});
