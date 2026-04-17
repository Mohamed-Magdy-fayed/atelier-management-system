import { z } from "zod";

import { LOCALE_COOKIE_NAME } from "@/features/core/i18n/lib";
import { baseProcedure, createTRPCRouter } from "../init";

export const appRouter = createTRPCRouter({
    hello: baseProcedure
        .input(
            z.object({
                text: z.string(),
            }),
        )
        .query((opts) => {
            return {
                greeting: opts.ctx.t("greetings", { name: opts.input.text, lastLoginDate: new Date() }),
            };
        }),
    i18n: {
        toggleLocale: baseProcedure.mutation(({ ctx }) => {
            const currentLocale = ctx.cookies.get(LOCALE_COOKIE_NAME)?.value || "en";
            const newLocale = currentLocale === "en" ? "ar" : "en";
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
});

export type AppRouter = typeof appRouter;
