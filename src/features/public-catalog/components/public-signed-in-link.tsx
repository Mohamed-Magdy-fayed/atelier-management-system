"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
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
    <Button
      className={cn(className)}
      render={<Link href={href} />}
      variant={active ? "secondary" : "default"}
    >
      {t(labelKey)}
    </Button>
  );
}
