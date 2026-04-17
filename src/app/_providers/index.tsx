import { ThemeProvider } from "next-themes";

import { TranslationProvider } from "@/features/core/i18n/react";
import { TRPCReactProvider } from "@/integrations/trpc/client";

export function Providers({ children, locale }: { children: React.ReactNode; locale: string }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="dark">
            <TranslationProvider defaultLocale={locale} fallbackLocale="en">
                <TRPCReactProvider>{children}</TRPCReactProvider>
            </TranslationProvider>
        </ThemeProvider>
    );
}
