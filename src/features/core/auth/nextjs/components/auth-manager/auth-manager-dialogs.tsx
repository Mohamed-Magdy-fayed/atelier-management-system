"use client";

import { SystemDialog } from "@/components/general/system-dialog";
import { H4, Muted } from "@/components/ui/typography";
import { ChangeEmailFormDialog } from "@/features/core/auth/nextjs/components/change-email-form";
import { ChangePasswordFormDialog } from "@/features/core/auth/nextjs/components/change-password-form";
import { OAuthConnections } from "@/features/core/auth/nextjs/components/oauth-connections";
import { PasskeyManager } from "@/features/core/auth/nextjs/components/passkey-manager";
import { ProfileFormDialog } from "@/features/core/auth/nextjs/components/profile-form";
import { useTranslation } from "@/features/core/i18n/client";

import type { AuthManagerDialog } from "./types";

type AuthManagerDialogsProps = {
  hasEmail: boolean;
  hasPassword: boolean;
  isEmailVerified: boolean;
  openDialog: AuthManagerDialog | undefined;
  setOpenDialog: (dialog: AuthManagerDialog | undefined) => void;
  userEmail: string | null;
};

export function AuthManagerDialogs({
  hasEmail,
  hasPassword,
  isEmailVerified,
  openDialog,
  setOpenDialog,
  userEmail,
}: AuthManagerDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      <ProfileFormDialog
        isOpen={openDialog === "profile"}
        onOpenChange={(open) => setOpenDialog(open ? "profile" : undefined)}
      />
      <ChangeEmailFormDialog
        isEmailVerified={isEmailVerified}
        isOpen={openDialog === "email"}
        onOpenChange={(open) => setOpenDialog(open ? "email" : undefined)}
        userEmail={userEmail}
      />
      <ChangePasswordFormDialog
        isCreate={!hasPassword}
        isOpen={openDialog === "password"}
        onOpenChange={(open) => setOpenDialog(open ? "password" : undefined)}
        titleRender={() => (
          <H4>
            {t("authTranslations.profile.password.createOrChange", {
              isChange: hasPassword ? "true" : "false",
            })}
          </H4>
        )}
      />
      <SystemDialog
        titleRender={() => (
          <H4>{t("authTranslations.oauth.connections.title")}</H4>
        )}
        descriptionRender={() => (
          <Muted>{t("authTranslations.oauth.connections.description")}</Muted>
        )}
        onOpenChange={(open) => setOpenDialog(open ? "oauth" : undefined)}
        isOpen={openDialog === "oauth"}
      >
        <OAuthConnections />
      </SystemDialog>
      <SystemDialog
        titleRender={() => <H4>{t("authTranslations.passkeys.manage")}</H4>}
        descriptionRender={() => (
          <Muted>{t("authTranslations.passkeys.settings.description")}</Muted>
        )}
        onOpenChange={(open) => setOpenDialog(open ? "passkeys" : undefined)}
        isOpen={openDialog === "passkeys"}
      >
        <PasskeyManager />
      </SystemDialog>
    </>
  );
}
