"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";

import { buttonVariants } from "@/components/ui/button";
import { Swap, SwapOff, SwapOn } from "@/components/ui/swap";
import { mainTranslations } from "@/features/core/i18n/global";
import { setLocaleCookie } from "@/features/core/i18n/server";
import {
  createI18n,
  type LanguageMessages,
  LOCALE_COOKIE_NAME,
} from "./lib";

const TranslationContext = createContext({
  locale: "en",
  dir: "ltr" as "rtl" | "ltr",
  setLocale: (_: string) => {},
  fallbackLocale: "en",
});

export function TranslationProvider({
  defaultLocale = navigator.language,
  fallbackLocale = "en",
  children,
}: {
  fallbackLocale?: string;
  defaultLocale?: string;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState(defaultLocale);
  const dir = useMemo(() => (locale === "ar" ? "rtl" : "ltr"), [locale]);

  return (
    <TranslationContext.Provider
      value={{ locale, setLocale, fallbackLocale, dir }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation<
  const T extends Record<string, LanguageMessages>,
>(translations?: T) {
  const router = useRouter();
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LocaleProvider");
  }

  const { t } = useMemo(
    () =>
      createI18n(
        translations || mainTranslations,
        context.locale,
        context.fallbackLocale,
      ),
    [translations, context.locale, context.fallbackLocale],
  );

  const [isPending, startTransition] = useTransition();

  const setLocale = (newLocale: string) => {
    const newDir = newLocale === "ar" ? "rtl" : "ltr";
    document.dir = newDir;
    document.documentElement.setAttribute("dir", newDir);
    context.setLocale(newLocale);
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(newLocale)}; path=/; samesite=lax`;

    startTransition(() => {
      void setLocaleCookie(newLocale).then(() => {
        router.refresh();
      });
    });
  };

  return {
    isPending,
    locale: context.locale,
    dir: context.dir,
    setLocale,
    t,
  };
}

export function LanguageToggle() {
  const { locale, setLocale } = useTranslation();

  return (
    <Swap
      className={buttonVariants({ variant: "ghost", size: "icon" })}
      animation="flip"
      onSwappedChange={(val) => setLocale(val ? "en" : "ar")}
      swapped={locale === "en"}
    >
      <SwapOn>AR</SwapOn>
      <SwapOff>EN</SwapOff>
    </Swap>
  );
}
