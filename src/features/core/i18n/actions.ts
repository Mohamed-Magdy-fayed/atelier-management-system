"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { mainTranslations } from "@/features/core/i18n/global";
import {
    createI18n,
    type LanguageMessages,
    LOCALE_COOKIE_NAME,
} from "@/features/core/i18n/lib";

export async function setLocaleCookie(locale: string) {
    (await cookies()).set(LOCALE_COOKIE_NAME, locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: "lax",
    });

    revalidatePath("/");
}

export async function getLocaleCookie() {
    const cookie = (await cookies()).get(LOCALE_COOKIE_NAME);
    return cookie?.value || "en";
}

/**
 * A server-side helper to get a fully-typed `t` function.
 * Does not use React hooks.
 *
 * @param translations The translations object for this specific context.
 * @returns A fully-typed `t` function.
 */
export async function getT<const T extends Record<string, LanguageMessages>>(
    translations?: T,
) {
    const locale = await getLocaleCookie();
    return {
        ...createI18n(translations || mainTranslations, locale, "en"),
        locale,
    };
}
