"use client";

import { Badge } from "@/components/ui/badge";
import type { EmployeeBranchRef } from "@/features/system/users/server/types";
import { cn } from "@/lib/utils";

const MAX_VISIBLE = 2;

type EmployeeBranchBadgesProps = {
  branches: EmployeeBranchRef[];
  locale: string;
  className?: string;
};

function branchLabel(branch: EmployeeBranchRef, locale: string) {
  return locale === "ar" ? branch.nameAr : branch.nameEn;
}

export function EmployeeBranchBadges({
  branches,
  locale,
  className,
}: EmployeeBranchBadgesProps) {
  if (branches.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const visible = branches.slice(0, MAX_VISIBLE);
  const overflow = branches.length - MAX_VISIBLE;
  const isStacked = branches.length > MAX_VISIBLE;

  return (
    <div
      className={cn(
        "flex max-w-[14rem] shrink-0 items-center",
        isStacked ? "-space-x-2" : "gap-1",
        "[&_[data-slot=badge]]:max-w-[7rem] [&_[data-slot=badge]]:truncate",
        isStacked &&
          "[&_[data-slot=badge]]:ring-2 [&_[data-slot=badge]]:ring-background",
        className,
      )}
    >
      {visible.map((branch, index) => (
        <Badge
          key={branch.id}
          variant="secondary"
          className={cn(
            "relative shrink-0 font-normal",
            isStacked && index > 0 && "z-1",
          )}
          title={branchLabel(branch, locale)}
        >
          {branchLabel(branch, locale)}
        </Badge>
      ))}
      {overflow > 0 ? (
        <Badge
          variant="secondary"
          className="relative z-2 shrink-0 font-normal"
          title={branches
            .slice(MAX_VISIBLE)
            .map((branch) => branchLabel(branch, locale))
            .join(", ")}
        >
          +{overflow}
        </Badge>
      ) : null}
    </div>
  );
}
