import { z } from "zod";

import { LOCALE_COOKIE_NAME } from "@/features/core/i18n/lib";
import { dashboardRouter } from "@/features/system/dashboard/server";
import {
  deleteImage,
  uploadFolderForUser,
  uploadImage,
} from "@/integrations/firebase/storage";
import { assertUploadWithinRateLimit } from "@/integrations/firebase/upload-rate-limit";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { branchesRouter } from "./branches";
import { customerPortalRouter } from "./customer-portal";
import { dressesRouter } from "./dresses";
import { expensesRouter } from "./expenses";
import { importRouter } from "./import";
import { paymentsRouter } from "./payments";
import { rentalCustomersRouter } from "./rental-customers";
import { reservationsRouter } from "./reservations";
import { settingsRouter } from "./settings";
import { usersRouter } from "./users";

export const appRouter = createTRPCRouter({
  i18n: {
    toggleLocale: baseProcedure
      .input(z.object({ newLocale: z.string() }))
      .mutation(({ ctx, input: { newLocale } }) => {
        ctx.cookies.set(LOCALE_COOKIE_NAME, newLocale, {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
        });

        return { newLocale };
      }),

    getLocale: baseProcedure.query(({ ctx }) => {
      const currentLocale = ctx.cookies.get(LOCALE_COOKIE_NAME)?.value || "en";
      return { currentLocale };
    }),
  },
  /**
   * Authenticated, not admin-only: the profile photo field on
   * `profile-form.tsx` is reachable by any signed-in user, including
   * customers. The dress gallery and the branding logo are admin screens, but
   * their own procedures already gate those writes — this one only needs to
   * establish that a real session is behind the upload.
   */
  uploadImage: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.string().startsWith("image/"),
        base64: z.string().min(1),
        oldUrl: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      await assertUploadWithinRateLimit(userId);

      const folder = uploadFolderForUser(userId);
      const url = await uploadImage(input.base64, input.mimeType, folder);

      // `oldUrl` is client-supplied, so the delete is confined to this user's
      // own folder. Without that it is an instruction to delete any object in
      // the bucket, which authentication alone does not fix.
      if (input.oldUrl) {
        await deleteImage(input.oldUrl, `${folder}/`);
      }

      return { url };
    }),
  branches: branchesRouter,
  customerPortal: customerPortalRouter,
  dashboard: dashboardRouter,
  dresses: dressesRouter,
  expenses: expensesRouter,
  import: importRouter,
  payments: paymentsRouter,
  rentalCustomers: rentalCustomersRouter,
  reservations: reservationsRouter,
  settings: settingsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
