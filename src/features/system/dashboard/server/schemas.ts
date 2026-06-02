import { z } from "zod";

export const getDashboardInput = z.object({
  branchId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
