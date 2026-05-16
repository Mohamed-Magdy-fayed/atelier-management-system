import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import {
  bulkSetSettingsActive,
  setSettingActive,
  updateSetting,
} from "./mutations";
import { listSettings } from "./queries";
import {
  listSettingsInput,
  settingBulkSetActiveSchema,
  settingSetActiveSchema,
  settingUpdateSchema,
} from "./schemas";

export const settingsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listSettingsInput)
    .query(async ({ ctx, input }) => listSettings(ctx, input)),
  update: protectedProcedure
    .input(settingUpdateSchema)
    .mutation(async ({ ctx, input }) => updateSetting(ctx, input)),
  setActive: protectedProcedure
    .input(settingSetActiveSchema)
    .mutation(async ({ ctx, input }) => setSettingActive(ctx, input)),
  bulkSetActive: protectedProcedure
    .input(settingBulkSetActiveSchema)
    .mutation(async ({ ctx, input }) => bulkSetSettingsActive(ctx, input)),
});
