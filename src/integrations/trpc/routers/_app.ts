import { z } from "zod";

import { LOCALE_COOKIE_NAME } from "@/features/core/i18n/lib";
import { dashboardRouter } from "@/features/system/dashboard/server";
import { deleteImage, uploadImage } from "@/integrations/firebase/storage";
import { baseProcedure, createTRPCRouter } from "../init";
import { branchesRouter } from "./branches";
import { customerPortalRouter } from "./customer-portal";
import { dressesRouter } from "./dresses";
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
  uploadImage: baseProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        mimeType: z.string().startsWith("image/"),
        base64: z.string().min(1),
        oldUrl: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const url = await uploadImage(input.base64, input.mimeType, "uploads");

      if (input.oldUrl) {
        await deleteImage(input.oldUrl);
      }

      return { url };
    }),
  branches: branchesRouter,
  customerPortal: customerPortalRouter,
  dashboard: dashboardRouter,
  dresses: dressesRouter,
  payments: paymentsRouter,
  rentalCustomers: rentalCustomersRouter,
  reservations: reservationsRouter,
  settings: settingsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
