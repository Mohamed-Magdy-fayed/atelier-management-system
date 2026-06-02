import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { getDashboardData } from "./queries";
import { getDashboardInput } from "./schemas";

export const dashboardRouter = createTRPCRouter({
  getData: protectedProcedure
    .input(getDashboardInput)
    .query(async ({ ctx, input }) => getDashboardData(ctx, input)),
});
