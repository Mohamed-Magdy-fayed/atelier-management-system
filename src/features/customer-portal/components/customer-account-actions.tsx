"use client";

import { Button } from "@/components/ui/button";
import { AuthManager } from "@/features/core/auth/nextjs/components/auth-manager";
import { useTranslation } from "@/features/core/i18n/client";

export function CustomerAccountActions() {
  const { t } = useTranslation();

  return (
    <AuthManager
      trigger={
        <Button type="button" variant="secondary">
          {String(t("customerPortal.manageAccount"))}
        </Button>
      }
    />
  );
}
