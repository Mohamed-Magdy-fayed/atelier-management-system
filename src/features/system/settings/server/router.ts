import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import { createSetting, deleteSetting, updateSetting } from "./mutations";
import { listSettings } from "./queries";
import {
  listSettingsInput,
  settingDeleteSchema,
  settingMutationSchema,
  settingUpdateSchema,
} from "./schemas";

export const settingsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listSettingsInput)
    .query(async ({ ctx, input }) => listSettings(ctx, input)),
  create: protectedProcedure
    .input(settingMutationSchema)
    .mutation(async ({ ctx, input }) => createSetting(ctx, input)),
  update: protectedProcedure
    .input(settingUpdateSchema)
    .mutation(async ({ ctx, input }) => updateSetting(ctx, input)),
  delete: protectedProcedure
    .input(settingDeleteSchema)
    .mutation(async ({ ctx, input }) => deleteSetting(ctx, input)),
});
