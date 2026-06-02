"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { useTranslation } from "@/features/core/i18n/client";
import { getPublicTabIndex } from "@/features/public-catalog/lib/public-tabs";
import { cn } from "@/lib/utils";

export function PublicMobilePageTransition({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const { dir } = useTranslation();
  const prevPathRef = useRef(pathname);
  const [direction, setDirection] = useState<"forward" | "back">("forward");

  useEffect(() => {
    const prev = prevPathRef.current;
    if (prev !== pathname) {
      const prevIdx = getPublicTabIndex(prev);
      const nextIdx = getPublicTabIndex(pathname);
      if (prevIdx !== nextIdx) {
        setDirection(nextIdx > prevIdx ? "forward" : "back");
      }
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  const isRtl = dir === "rtl";
  const slideClass =
    direction === "forward"
      ? isRtl
        ? "max-md:slide-in-from-left-2"
        : "max-md:slide-in-from-right-2"
      : isRtl
        ? "max-md:slide-in-from-right-2"
        : "max-md:slide-in-from-left-2";

  return (
    <div className="relative min-h-0 flex-1 overflow-x-hidden md:overflow-visible">
      <div
        key={pathname}
        className={cn(
          "min-h-full md:animate-none",
          "max-md:animate-in max-md:fade-in-0 max-md:duration-300",
          slideClass,
        )}
      >
        {children}
      </div>
    </div>
  );
}
