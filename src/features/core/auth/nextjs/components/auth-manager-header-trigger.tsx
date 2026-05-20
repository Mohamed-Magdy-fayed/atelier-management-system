"use client";

import { UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AuthManager } from "@/features/core/auth/nextjs/components/auth-manager";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { UserAvatar } from "@/features/core/auth/nextjs/components/user-avatar";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

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
        <UserAvatar
          className="size-8"
          fallbackClassName="text-xs font-medium"
        />
      ) : (
        <UserIcon className="size-[1.15rem]" aria-hidden />
      )}
    </Button>
  );

  return <AuthManager trigger={trigger} />;
}
