"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { useTranslation } from "@/features/core/i18n/client";
import {
  getPublicAccountDestination,
  isPublicAccountPathActive,
} from "@/features/public-catalog/lib/public-account-destination";
import { cn } from "@/lib/utils";

export function PublicSignedInLink({ className }: { className?: string }) {
  const { isAuthenticated, session } = useAuth();
  const pathname = usePathname() ?? "/";
  const { t } = useTranslation();

  if (!isAuthenticated) return null;

  const { href, labelKey } = getPublicAccountDestination(session.user);
  const active = isPublicAccountPathActive(pathname, href);

  return (
    <Link
      className={cn(
        "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
        className,
      )}
      href={href}
    >
      {String(t(labelKey))}
    </Link>
  );
}
