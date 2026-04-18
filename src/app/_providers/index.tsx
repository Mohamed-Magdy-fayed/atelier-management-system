import type { PropsWithChildren } from "react";

import { ThemeProvider } from "@/features/core/color-theme/client";
import type { Theme } from "@/features/core/color-theme/server";
import { TranslationProvider } from "@/features/core/i18n/client";
import { TRPCReactProvider } from "@/integrations/trpc/client";

type ProvidersProps = PropsWithChildren<{
    locale: string;
    theme: Theme;
}>;

export function Providers({ children, locale, theme }: ProvidersProps) {
    return (
        <ThemeProvider theme={theme}>
            <TranslationProvider defaultLocale={locale} fallbackLocale="en">
                <TRPCReactProvider>{children}</TRPCReactProvider>
            </TranslationProvider>
        </ThemeProvider>
    );
}
