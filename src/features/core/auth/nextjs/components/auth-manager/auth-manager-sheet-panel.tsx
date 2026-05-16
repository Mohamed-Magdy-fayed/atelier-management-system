"use client";

import {
  LayoutDashboardIcon,
  ListTreeIcon,
  LockKeyhole,
  LogInIcon,
  LogOut,
  MailIcon,
  ShieldBanIcon,
  UserIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { startTransition, useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Separator } from "@/components/ui/separator";
import { Status, StatusIndicator } from "@/components/ui/status";
import { canViewAdminDashboard } from "@/features/core/auth/core/permissions";
import { signOutAction } from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { ThemeToggle } from "@/features/core/color-theme/client";
import { LanguageToggle, useTranslation } from "@/features/core/i18n/client";

import { AuthManagerDialogs } from "./auth-manager-dialogs";
import type { AuthManagerDialog } from "./types";

function SheetAction({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-start text-sm font-medium transition-colors hover:bg-muted"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function AuthManagerSheetPanel() {
  const { isAuthenticated, session } = useAuth();
  const { t } = useTranslation();
  const [openDialog, setOpenDialog] = useState<AuthManagerDialog | undefined>();

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-2">
        <SheetAction
          onClick={() => {
            /* navigation via link wrapper */
          }}
        >
          <Link className="flex w-full items-center gap-3" href="/sign-in">
            <LogInIcon className="size-5 shrink-0 text-muted-foreground" />
            {t("authTranslations.signIn.title")}
          </Link>
        </SheetAction>
        <SheetAction>
          <Link className="flex w-full items-center gap-3" href="/sign-up">
            <UserPlusIcon className="size-5 shrink-0 text-muted-foreground" />
            {t("authTranslations.signUp.title")}
          </Link>
        </SheetAction>
        <Separator className="my-2" />
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
          <span className="font-medium text-muted-foreground text-xs">
            {String(t("themeToggle"))}
          </span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 px-4 py-3">
          <span className="font-medium text-muted-foreground text-xs">
            {String(t("languageToggle"))}
          </span>
          <LanguageToggle />
        </div>
      </div>
    );
  }

  const hasEmail = !!session.user.email;
  const isEmailVerified = !!session.user.emailVerifiedAt;
  const display = session.user.name?.trim() || session.user.email;
  const showDashboardLink = canViewAdminDashboard(session.user);

  return (
    <>
      <AuthManagerDialogs
        hasEmail={hasEmail}
        hasPassword={!!session.hasPassword}
        isEmailVerified={isEmailVerified}
        openDialog={openDialog}
        setOpenDialog={setOpenDialog}
        userEmail={session.user.email}
      />
      <div className="flex flex-col gap-1">
        <p className="mb-2 truncate px-3 font-medium text-sm">{display}</p>
        <p className="mb-3 truncate px-3 text-muted-foreground text-xs">
          {session.user.email}
        </p>
        {showDashboardLink ? (
          <SheetAction>
            <Link className="flex w-full items-center gap-3" href="/dashboard">
              <LayoutDashboardIcon className="size-5 shrink-0 text-muted-foreground" />
              {String(t("common.dashboard"))}
            </Link>
          </SheetAction>
        ) : null}
        <SheetAction onClick={() => setOpenDialog("profile")}>
          <UserIcon className="size-5 shrink-0 text-muted-foreground" />
          {t("authTranslations.profile.title")}
        </SheetAction>
        <SheetAction onClick={() => setOpenDialog("email")}>
          <MailIcon className="size-5 shrink-0 text-muted-foreground" />
          <span className="flex flex-1 items-center justify-between gap-2">
            <span>
              {!hasEmail
                ? t("authTranslations.profile.email.add")
                : !isEmailVerified
                  ? t("authTranslations.emailVerification.verifyEmail")
                  : t("authTranslations.profile.email.change")}
            </span>
            {hasEmail && !isEmailVerified ? (
              <Status variant="warning">
                <StatusIndicator />
              </Status>
            ) : null}
          </span>
        </SheetAction>
        <SheetAction onClick={() => setOpenDialog("password")}>
          <ShieldBanIcon className="size-5 shrink-0 text-muted-foreground" />
          {t("authTranslations.profile.password.createOrChange", {
            isChange: session.hasPassword ? "true" : "false",
          })}
        </SheetAction>
        <SheetAction onClick={() => setOpenDialog("oauth")}>
          <ListTreeIcon className="size-5 shrink-0 text-muted-foreground" />
          {t("authTranslations.oauth.manage")}
        </SheetAction>
        <SheetAction onClick={() => setOpenDialog("passkeys")}>
          <LockKeyhole className="size-5 shrink-0 text-muted-foreground" />
          {t("authTranslations.passkeys.manage")}
        </SheetAction>
        <Separator className="my-2" />
        <ButtonGroup className="w-full px-3 *:flex-1">
          <ThemeToggle />
          <LanguageToggle />
        </ButtonGroup>
        <Separator className="my-2" />
        <SheetAction
          onClick={() =>
            startTransition(async () => {
              await signOutAction();
            })
          }
        >
          <LogOut className="size-5 shrink-0 text-destructive" />
          <span className="text-destructive">
            {t("authTranslations.signOut")}
          </span>
        </SheetAction>
      </div>
    </>
  );
}
