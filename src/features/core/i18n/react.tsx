"use client";

import { useMutation } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";

import { Swap, SwapOff, SwapOn } from "@/components/ui/swap";
import { mainTranslations } from "@/features/core/i18n/global";
import { useTRPC } from "@/integrations/trpc/client";
import { createI18n, type LanguageMessages } from "./lib";

const TranslationContext = createContext({
  locale: "en",
  dir: "ltr" as "rtl" | "ltr",
  setLocale: (_: string) => { },
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

  const trpc = useTRPC();
  const { mutate: toggleLocale } = useMutation(
    trpc.i18n.toggleLocale.mutationOptions(),
  );

  const setLocale = (newLocale: string) => {
    const newDir = newLocale === "ar" ? "rtl" : "ltr";
    document.dir = newDir;
    document.documentElement.setAttribute("dir", newDir);
    context.setLocale(newLocale);

    startTransition(() => {
      toggleLocale();
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

export function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();

  return (
    <Swap
      animation="flip"
      onSwappedChange={(val) => setLocale(val ? "en" : "ar")}
      swapped={locale === "en"}
    >
      <SwapOn>AR</SwapOn>
      <SwapOff>EN</SwapOff>
    </Swap>
  );
}
