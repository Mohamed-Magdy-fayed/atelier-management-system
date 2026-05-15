"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export const MOBILE_TAB_BAR_BOTTOM_PADDING =
  "pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0";

export function MobileTabBar({
  ariaLabel,
  children,
}: {
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.15)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid h-15 max-w-lg grid-cols-5">{children}</div>
    </nav>
  );
}

export function MobileTabLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      className={cn(
        "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground active:bg-muted/60",
      )}
      href={href}
    >
      <Icon className="size-[1.35rem] shrink-0" aria-hidden />
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </Link>
  );
}

export function MobileTabButton({
  icon: Icon,
  label,
  onClick,
  type = "button",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      className={cn(
        "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium text-muted-foreground transition-colors",
        "hover:text-foreground active:bg-muted/60",
      )}
      onClick={onClick}
      type={type}
    >
      <Icon className="size-[1.35rem] shrink-0" aria-hidden />
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </button>
  );
}
