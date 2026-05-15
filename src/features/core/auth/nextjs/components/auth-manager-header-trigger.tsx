"use client";

import { UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AuthManager } from "@/features/core/auth/nextjs/components/auth-manager";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

function userInitials(name: string | null | undefined, email: string): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    const initials = `${first}${last}`.toUpperCase();
    if (initials) return initials;
  }
  return email.slice(0, 2).toUpperCase();
}

export function AuthManagerHeaderTrigger({
  className,
}: {
  className?: string;
}) {
  const { isAuthenticated, session } = useAuth();
  const { t } = useTranslation();

  const accountLabel = isAuthenticated
    ? session.user.name?.trim() || session.user.email
    : String(t("landing.headerAccountMenu"));

  const trigger = (
    <Button
      aria-label={accountLabel}
      className={cn("size-9 shrink-0 rounded-full p-0", className)}
      size="icon"
      type="button"
      variant="outline"
    >
      {isAuthenticated ? (
        <Avatar className="size-8">
          <AvatarFallback className="text-xs font-medium">
            {userInitials(session.user.name, session.user.email)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <UserIcon className="size-[1.15rem]" aria-hidden />
      )}
    </Button>
  );

  return <AuthManager trigger={trigger} />;
}
