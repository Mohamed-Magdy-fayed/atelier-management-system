"use client";

import { LogInIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
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
import { ThemeToggle } from "@/features/core/color-theme/client";
import { LanguageToggle, useTranslation } from "@/features/core/i18n/client";
import { useIsMobile } from "@/hooks/use-mobile";

export function AuthManagerGuestMenu({ trigger }: { trigger: ReactElement }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent
        align="start"
        className="min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/sign-in" />}>
            <LogInIcon />
            {t("authTranslations.signIn.title")}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/sign-up" />}>
            <UserPlusIcon />
            {t("authTranslations.signUp.title")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <ButtonGroup className="w-full *:flex-1">
            <ThemeToggle />
            <LanguageToggle />
          </ButtonGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
