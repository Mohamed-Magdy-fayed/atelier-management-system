import { z } from "zod";

import { LOCALE_COOKIE_NAME } from "@/features/core/i18n/lib";
import { dashboardRouter } from "@/features/system/dashboard/server";
import { uploadImage } from "@/integrations/firebase/storage";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";
import { blogPostsRouter } from "./blog-posts";
import { branchesRouter } from "./branches";
import { caseStudiesRouter } from "./case-studies";
import { leadsRouter } from "./leads";
import { servicesMgmtRouter } from "./services-mgmt";
import { settingsRouter } from "./settings";
import { subscribersRouter } from "./subscribers";
import { testimonialsRouter } from "./testimonials";
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

  uploadImage: protectedProcedure
    .input(
      z.object({
        base64: z.string().min(1),
        mimeType: z.string().startsWith("image/"),
        folder: z.string().min(1).default("uploads"),
      }),
    )
    .mutation(async ({ input }) => {
      const url = await uploadImage(input.base64, input.mimeType, input.folder);
      return { url };
    }),

  branches: branchesRouter,
  blogPosts: blogPostsRouter,
  caseStudies: caseStudiesRouter,
  dashboard: dashboardRouter,
  leads: leadsRouter,
  servicesMgmt: servicesMgmtRouter,
  settings: settingsRouter,
  subscribers: subscribersRouter,
  testimonials: testimonialsRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
