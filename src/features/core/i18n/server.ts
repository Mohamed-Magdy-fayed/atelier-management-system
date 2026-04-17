"use server";

import { cookies } from "next/headers";

import { mainTranslations } from "@/features/core/i18n/global";
import { createI18n, LOCALE_COOKIE_NAME } from "@/features/core/i18n/lib";

export async function getT() {
    const cookieStore = await cookies();
    const locale = cookieStore.get(LOCALE_COOKIE_NAME)?.value || "en";
    return createI18n(mainTranslations, locale, "en");
}
