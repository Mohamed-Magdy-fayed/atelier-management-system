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
import { cn } from "@/lib/utils";

const guestMenuItemClassName =
  "min-h-10 gap-2.5 px-2.5 py-2.5 text-sm sm:min-h-7 sm:py-1 sm:text-xs/relaxed";

export function AuthManagerGuestMenu({ trigger }: { trigger: ReactElement }) {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent
        align="start"
        className={cn("min-w-56 rounded-lg", isMobile && "p-1.5")}
        side={isMobile ? "bottom" : "right"}
        sideOffset={4}
      >
        <DropdownMenuGroup className="flex flex-col gap-1">
          <DropdownMenuItem
            className={guestMenuItemClassName}
            render={<Link href="/sign-in" />}
          >
            <LogInIcon />
            {t("authTranslations.signIn.title")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={guestMenuItemClassName}
            render={<Link href="/sign-up" />}
          >
            <UserPlusIcon />
            {t("authTranslations.signUp.title")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className={isMobile ? "my-2" : undefined} />
        <DropdownMenuGroup>
          <ButtonGroup className="w-full gap-1 *:flex-1">
            <ThemeToggle />
            <LanguageToggle />
          </ButtonGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
