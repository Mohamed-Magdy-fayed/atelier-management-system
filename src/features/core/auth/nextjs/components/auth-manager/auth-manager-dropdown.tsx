"use client";

import {
  ListTreeIcon,
  LockKeyhole,
  LogOut,
  MailIcon,
  ShieldBanIcon,
  UserIcon,
} from "lucide-react";
import type { ReactElement } from "react";

import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Status, StatusIndicator } from "@/components/ui/status";
import { ThemeToggle } from "@/features/core/color-theme/client";
import { LanguageToggle, useTranslation } from "@/features/core/i18n/client";
import { useIsMobile } from "@/hooks/use-mobile";

import type { AuthManagerDialog } from "./types";

type AuthManagerDropdownProps = {
  hasEmail: boolean;
  hasPassword: boolean;
  isEmailVerified: boolean;
  onOpenDialog: (dialog: AuthManagerDialog) => void;
  onSignOut: () => void;
  trigger: ReactElement;
};

export function AuthManagerDropdown({
  hasEmail,
  hasPassword,
  isEmailVerified,
  onOpenDialog,
  onSignOut,
  trigger,
}: AuthManagerDropdownProps) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent
        align={isMobile ? "start" : "end"}
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onOpenDialog("profile")}>
            <UserIcon />
            {t("authTranslations.profile.title")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog("email")}>
            <MailIcon />
            {!hasEmail
              ? t("authTranslations.profile.email.add")
              : !isEmailVerified
                ? t("authTranslations.emailVerification.verifyEmail")
                : t("authTranslations.profile.email.change")}
            {hasEmail && !isEmailVerified ? (
              <Status className="ms-auto" variant="warning">
                <StatusIndicator />
              </Status>
            ) : null}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog("password")}>
            <ShieldBanIcon />
            {t("authTranslations.profile.password.createOrChange", {
              isChange: hasPassword ? "true" : "false",
            })}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog("oauth")}>
            <ListTreeIcon />
            {t("authTranslations.oauth.manage")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenDialog("passkeys")}>
            <LockKeyhole />
            {t("authTranslations.passkeys.manage")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ButtonGroup className="w-full *:flex-1">
            <ThemeToggle />
            <LanguageToggle />
          </ButtonGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} variant="destructive">
          <LogOut />
          {t("authTranslations.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
