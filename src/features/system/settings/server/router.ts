import { diagnoseWhatsAppSender } from "@/features/system/whatsapp/server/diagnostics";
import { createTRPCRouter, protectedProcedure } from "@/integrations/trpc/init";

import {
  bulkSetSettingsActive,
  setSettingActive,
  updateSetting,
} from "./mutations";
import { listSettings } from "./queries";
import { assertAdminRole, getRequiredSession } from "./shared";
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
  /**
   * Live check of the WhatsApp integration. Calls Wapilot, so it is a query the
   * settings page runs on load and re-runs after any settings mutation rather
   * than something polled.
   */
  whatsappStatus: protectedProcedure.query(async ({ ctx }) => {
    const session = getRequiredSession(ctx);
    assertAdminRole(session.user.role);
    return diagnoseWhatsAppSender(ctx.db);
  }),
});
