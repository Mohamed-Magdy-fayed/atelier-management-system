"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Children, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/** In-flow shell styles for mobile bottom navigation (not fixed). */
export const mobileTabBarShellClassName =
  "shrink-0 border-t border-border/80 bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.08)] md:hidden";

export function MobileTabBar({
  ariaLabel,
  columnCount,
  children,
}: {
  ariaLabel: string;
  /** Defaults to the number of direct children (tabs + “More”). */
  columnCount?: number;
  children: ReactNode;
}) {
  const columns = columnCount ?? Children.count(children);

  return (
    <nav aria-label={ariaLabel} className={mobileTabBarShellClassName}>
      <div
        className="mx-auto grid h-15 max-w-lg"
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
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
        "relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground active:bg-muted/60",
      )}
      href={href}
    >
      <span
        className={cn(
          "absolute inset-x-3 top-0 h-[2.5px] rounded-full bg-primary transition-opacity duration-300",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon className="size-[1.35rem] shrink-0" aria-hidden />
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </Link>
  );
}

export function MobileTabButton({
  icon: Icon,
  label,
  active,
  onClick,
  type = "button",
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      className={cn(
        "relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.625rem] font-medium transition-colors",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground active:bg-muted/60",
      )}
      onClick={onClick}
      type={type}
    >
      <span
        className={cn(
          "absolute inset-x-3 top-0 h-[2.5px] rounded-full bg-primary transition-opacity duration-300",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      <Icon className="size-[1.35rem] shrink-0" aria-hidden />
      <span className="line-clamp-2 text-center leading-tight">{label}</span>
    </button>
  );
}
