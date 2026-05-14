import type { PropsWithChildren } from "react";

import { BackLink } from "@/components/general/back-link";
import { Card, CardContent } from "@/components/ui/card";
import { AuthPlaceholder } from "@/features/core/auth/nextjs/components/auth-page-placeholder";
import { ThemeToggle } from "@/features/core/color-theme/client";
import { LanguageToggle } from "@/features/core/i18n/client";
import { getT } from "@/features/core/i18n/server";

type AuthLayoutProps = PropsWithChildren;

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = await getT();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6">
      <div className="w-full max-w-sm md:max-w-4xl">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6">
              <div className="flex items-center gap-2 justify-between">
                <BackLink
                  variant={"link"}
                  className="ps-0"
                  href="/"
                  text={t("authTranslations.backToHome")}
                />
                <div className="flex gap-2 items-center">
                  <ThemeToggle />
                  <LanguageToggle />
                </div>
              </div>
              {children}
            </div>
            <div className="relative hidden bg-muted p-6 md:block">
              <AuthPlaceholder />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
