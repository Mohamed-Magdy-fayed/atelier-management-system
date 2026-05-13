"use client";

import { BuildingIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

import type { BranchManagerVariant } from "./types";

type BranchManagerTriggerProps = {
  branchLabel: string;
  hasActiveBranch: boolean;
  isDisabled: boolean;
  variant: BranchManagerVariant;
};

export function BranchManagerTrigger({
  branchLabel,
  hasActiveBranch,
  isDisabled,
  variant,
}: BranchManagerTriggerProps) {
  const { t } = useTranslation();

  if (variant === "sidebar") {
    return (
      <SidebarMenuButton
        size="lg"
        disabled={isDisabled}
        tooltip={branchLabel}
        className={cn(
          "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
          isDisabled && "opacity-40",
        )}
      >
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <BuildingIcon className="size-4" aria-hidden />
        </div>
        <div className="grid flex-1 text-start text-sm leading-tight">
          <span className="truncate font-semibold">{branchLabel}</span>
          {hasActiveBranch ? (
            <span className="truncate text-xs text-sidebar-foreground/70">
              {t("authTranslations.branch.switcher.activeBadge")}
            </span>
          ) : null}
        </div>
        <ChevronsUpDownIcon className="ms-auto size-4" aria-hidden />
      </SidebarMenuButton>
    );
  }

  return (
    <Button
      variant="outline"
      disabled={isDisabled}
      className={cn(isDisabled && "opacity-40")}
    >
      <BuildingIcon className="text-primary" />
      <span className="truncate font-medium">{branchLabel}</span>
    </Button>
  );
}
