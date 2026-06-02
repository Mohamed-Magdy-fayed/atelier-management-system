import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { getDashboardData } from "./queries";

export const dashboardRouter = createTRPCRouter({
  getData: protectedProcedure.query(({ ctx }) => getDashboardData(ctx)),
});
