"use client";

import { Activity } from "react";

import { SystemDialog } from "@/components/general/system-dialog";
import { H4, Muted } from "@/components/ui/typography";
import { ChangeEmailForm } from "@/features/core/auth/nextjs/components/change-email-form";
import { ChangePasswordForm } from "@/features/core/auth/nextjs/components/change-password-form";
import { EmailVerificationNotice } from "@/features/core/auth/nextjs/components/email-verification-notice";
import { OAuthConnections } from "@/features/core/auth/nextjs/components/oauth-connections";
import { PasskeyManager } from "@/features/core/auth/nextjs/components/passkey-manager";
import { ProfileForm } from "@/features/core/auth/nextjs/components/profile-form";
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
      <SystemDialog
        onOpenChange={(open) => setOpenDialog(open ? "profile" : undefined)}
        isOpen={openDialog === "profile"}
        titleRender={() => <H4>{t("authTranslations.profile.title")}</H4>}
        descriptionRender={() => (
          <Muted>{t("authTranslations.profile.description")}</Muted>
        )}
      >
        <ProfileForm callback={() => setOpenDialog(undefined)} />
      </SystemDialog>
      <SystemDialog
        titleRender={() => (
          <H4>{t("authTranslations.emailVerification.notice.title")}</H4>
        )}
        descriptionRender={() => <Muted>{userEmail}</Muted>}
        onOpenChange={(open) => setOpenDialog(open ? "email" : undefined)}
        isOpen={openDialog === "email"}
      >
        <div className="flex flex-col gap-4">
          <EmailVerificationNotice
            isVerified={isEmailVerified}
            onClose={() => setOpenDialog(undefined)}
          />
          <Activity mode={isEmailVerified || !hasEmail ? "visible" : "hidden"}>
            <ChangeEmailForm />
          </Activity>
        </div>
      </SystemDialog>
      <SystemDialog
        titleRender={() => (
          <H4>
            {t("authTranslations.profile.password.createOrChange", {
              isChange: hasPassword ? "true" : "false",
            })}
          </H4>
        )}
        onOpenChange={(open) => setOpenDialog(open ? "password" : undefined)}
        isOpen={openDialog === "password"}
      >
        <ChangePasswordForm
          callback={() => setOpenDialog(undefined)}
          isCreate={!hasPassword}
        />
      </SystemDialog>
      <SystemDialog
        titleRender={() => <H4>{t("authTranslations.oauth.connections.title")}</H4>}
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
