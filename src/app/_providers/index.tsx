import { DirectionProvider } from "@base-ui/react";
import type { PropsWithChildren } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getAuth, getBranches } from "@/features/core/auth/nextjs/actions";
import { AuthProvider } from "@/features/core/auth/nextjs/components/auth-provider";
import { BranchProvider } from "@/features/core/auth/nextjs/components/branch-provider";
import { ThemeProvider } from "@/features/core/color-theme/client";
import type { Theme } from "@/features/core/color-theme/server";
import { TranslationProvider } from "@/features/core/i18n/client";
import { TRPCReactProvider } from "@/integrations/trpc/client";

type ProvidersProps = PropsWithChildren<{
  locale: string;
  theme: Theme;
}>;

export async function Providers({ children, locale, theme }: ProvidersProps) {
  const authState = await getAuth();
  const branchsState = authState.session?.user.id
    ? await getBranches(authState.session.user.id, {
        includeAllBranches: authState.session.user.role === "admin",
      })
    : null;

  return (
    <ThemeProvider theme={theme}>
      <TranslationProvider defaultLocale={locale} fallbackLocale="en">
        <AuthProvider value={authState}>
          <BranchProvider value={branchsState}>
            <TRPCReactProvider>
              <DirectionProvider direction={locale === "ar" ? "rtl" : "ltr"}>
                <TooltipProvider>
                  {children}
                  <Toaster />
                </TooltipProvider>
              </DirectionProvider>
            </TRPCReactProvider>
          </BranchProvider>
        </AuthProvider>
      </TranslationProvider>
    </ThemeProvider>
  );
}
