"use client";

import { BuildingIcon, ChevronsUpDownIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { WrapWithTooltip } from "@/components/general/wrap-with-tooltip";
import { Button } from "@/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  clearActiveBranchForUserAction,
  deleteBranchAction,
  setActiveBranchForUserAction,
} from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { BranchManagerDialogs } from "@/features/core/auth/nextjs/components/branch-manager/branch-manager-dialogs";
import { BranchManagerDropdown } from "@/features/core/auth/nextjs/components/branch-manager/branch-manager-dropdown";
import type {
  BranchManagerVariant,
  EditableBranch,
} from "@/features/core/auth/nextjs/components/branch-manager/types";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

export function BranchManager({
  variant = "default",
}: {
  /**
   * Visual variant for the dropdown trigger:
   * - `default` — a regular `Button` (used in headers).
   * - `sidebar` — a `SidebarMenuButton size="lg"` that fits the official
   *   shadcn sidebar header slot, collapses to an icon when the sidebar
   *   collapses, and inherits sidebar theme tokens.
   */
  variant?: BranchManagerVariant;
} = {}) {
  const { t, locale } = useTranslation();
  const { isAuthenticated, session } = useAuth();
  const branchState = useBranch();
  const isCustomer = isAuthenticated ? session.user.role === "customer" : false;
  const isAdmin = isAuthenticated ? session.user.role === "admin" : false;
  const canManageBranches = isAdmin;
  const hasBranchState = branchState != null;
  const hasActiveOrg = hasBranchState ? branchState.hasActiveOrg : false;
  const branches = hasBranchState ? branchState.branches : [];
  const activeBranch = hasBranchState ? branchState.activeBranch : undefined;
  const isSwitcherDisabled = !isAdmin && branches.length === 0;

  const [openDialog, setOpenDialog] = useState<"branch:create" | undefined>();
  const [editingBranch, setEditingBranch] = useState<
    EditableBranch | undefined
  >();
  const [deletingBranch, setDeletingBranch] = useState<
    EditableBranch | undefined
  >();
  const [isPending, startTransition] = useTransition();

  function setActiveBranch(id: string) {
    startTransition(async () => {
      const res = await setActiveBranchForUserAction(id);
      if (res.isError) {
        toast.error(res.message);
        return;
      }

      toast.success(
        t("authTranslations.branch.actions.setActiveBranch.success"),
      );
    });
  }

  function clearActiveBranch() {
    startTransition(async () => {
      const res = await clearActiveBranchForUserAction();
      if (res.isError) {
        toast.error(res.message);
        return;
      }

      toast.success(
        t("authTranslations.branch.actions.clearActiveBranch.success"),
      );
    });
  }

  function confirmDeleteBranch() {
    if (!deletingBranch) return;

    startTransition(async () => {
      const res = await deleteBranchAction(deletingBranch.id);
      if (res.isError) {
        toast.error(res.message);
        return;
      }
      toast.success(t("authTranslations.branch.actions.deleteBranch.success"));
      setDeletingBranch(undefined);
    });
  }

  const branchLabel =
    !hasActiveOrg || !activeBranch
      ? branches.length > 0
        ? String(t("authTranslations.branch.switcher.allBranches"))
        : String(t("authTranslations.branch.switcher.select"))
      : locale === "ar"
        ? activeBranch.nameAr
        : activeBranch.nameEn;

  const triggerButton =
    variant === "sidebar" ? (
      <SidebarMenuButton
        size="lg"
        disabled={isSwitcherDisabled}
        tooltip={branchLabel}
        className={cn(
          "data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground",
          isSwitcherDisabled && "opacity-40",
        )}
      >
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <BuildingIcon className="size-4" aria-hidden />
        </div>
        <div className="grid flex-1 text-start text-sm leading-tight">
          <span className="truncate font-semibold">{branchLabel}</span>
          {hasActiveOrg && activeBranch ? (
            <span className="truncate text-xs text-sidebar-foreground/70">
              {t("authTranslations.branch.switcher.activeBadge")}
            </span>
          ) : null}
        </div>
        <ChevronsUpDownIcon className="ms-auto size-4" aria-hidden />
      </SidebarMenuButton>
    ) : (
      <Button
        variant="outline"
        disabled={isSwitcherDisabled}
        className={cn(isSwitcherDisabled && "opacity-40")}
      >
        <BuildingIcon className="text-primary" />
        <span className="truncate font-medium">{branchLabel}</span>
        <ChevronsUpDownIcon
          className="size-4 text-muted-foreground"
          aria-hidden
        />
      </Button>
    );

  if (!isAuthenticated || !hasBranchState || isCustomer) {
    return null;
  }

  if (isSwitcherDisabled) {
    // In the sidebar slot the disabled trigger is wrapped in the same menu
    // item so the layout doesn't collapse to a bare element.
    if (variant === "sidebar") {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <WrapWithTooltip
              text={t("authTranslations.branch.switcher.noAssignedBranches")}
            >
              <span className="inline-flex w-full">{triggerButton}</span>
            </WrapWithTooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }
    return (
      <WrapWithTooltip
        text={t("authTranslations.branch.switcher.noAssignedBranches")}
      >
        <span className="inline-flex">{triggerButton}</span>
      </WrapWithTooltip>
    );
  }

  const content = (
    <>
      <BranchManagerDialogs
        deletingBranch={deletingBranch}
        editingBranch={editingBranch}
        isPending={isPending}
        onConfirmDelete={confirmDeleteBranch}
        onOpenCreateChange={(open) =>
          setOpenDialog(open ? "branch:create" : undefined)
        }
        openCreateDialog={openDialog === "branch:create"}
        setDeletingBranch={setDeletingBranch}
        setEditingBranch={setEditingBranch}
      />
      <BranchManagerDropdown
        trigger={triggerButton}
        branches={branches}
        canManageBranches={canManageBranches}
        isPending={isPending}
        locale={locale}
        onCreateBranch={() => setOpenDialog("branch:create")}
        onClearActiveBranch={clearActiveBranch}
        onDeleteBranch={setDeletingBranch}
        onEditBranch={setEditingBranch}
        onSetActiveBranch={setActiveBranch}
      />
    </>
  );

  if (variant === "sidebar") {
    return (
      <SidebarMenu>
        <SidebarMenuItem>{content}</SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return content;
}
