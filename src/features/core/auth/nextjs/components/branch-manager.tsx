"use client";

import {
    AlertTriangleIcon,
    BuildingIcon,
    ChevronsUpDownIcon,
    EditIcon,
    ListStartIcon,
    Plus,
    Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { SystemDialog } from "@/components/general/system-dialog";
import { WrapWithTooltip } from "@/components/general/wrap-with-tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { H4, Lead } from "@/components/ui/typography";
import {
    deleteBranchAction,
    setActiveBranchForUserAction,
} from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { BranchForm } from "@/features/core/auth/nextjs/components/branch-form";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type BranchManagerVariant = "default" | "sidebar";

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
    const isMobile = useIsMobile();
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

    const [openDialog, setOpenDialog] = useState<"org:create" | undefined>(
        undefined,
    );
    const [editingOrg, setEditingOrg] = useState<
        { id: string; nameEn: string; nameAr: string } | undefined
    >(undefined);
    const [deletingOrg, setDeletingOrg] = useState<
        { id: string; nameEn: string; nameAr: string } | undefined
    >(undefined);
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

    const branchLabel =
        !hasActiveOrg || !activeBranch
            ? String(t("authTranslations.branch.switcher.select"))
            : locale === "ar"
                ? activeBranch.nameAr
                : activeBranch.nameEn;

    // Render the trigger differently depending on where the BranchManager
    // is mounted. Sidebar variant matches the official shadcn header slot.
    const triggerButton =
        variant === "sidebar" ? (
            <SidebarMenuButton
                size="lg"
                disabled={isSwitcherDisabled}
                tooltip={branchLabel}
                className={cn(
                    "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
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
                            text={t(
                                "authTranslations.branch.switcher.noAssignedBranches",
                            )}
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
            <AlertDialog
                onOpenChange={(open) => setDeletingOrg(open ? deletingOrg : undefined)}
                open={deletingOrg !== undefined}
            >
                <AlertDialogContent>
                    <AlertDialogHeader className="flex items-center gap-2 justify-center">
                        <AlertTriangleIcon />
                        <AlertDialogTitle>{t("common.areYouSure")}</AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction
                            disabled={isPending}
                            onClick={() => {
                                if (!deletingOrg) return;
                                startTransition(async () => {
                                    const res = await deleteBranchAction(deletingOrg.id);
                                    if (res.isError) {
                                        toast.error(res.message);
                                        return;
                                    }
                                    toast.success(
                                        t("authTranslations.branch.actions.deleteBranch.success"),
                                    );
                                    setDeletingOrg(undefined);
                                });
                            }}
                        >
                            {t("common.confirm")}
                        </AlertDialogAction>
                        <AlertDialogCancel disabled={isPending}>
                            {t("common.cancel")}
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <SystemDialog
                titleRender={() => <H4>{t("authTranslations.branch.create.title")}</H4>}
                onOpenChange={(val) => setOpenDialog(val ? "org:create" : undefined)}
                isOpen={openDialog === "org:create"}
            >
                <BranchForm onSuccess={() => setOpenDialog(undefined)} />
            </SystemDialog>
            <SystemDialog
                onOpenChange={(open) => setEditingOrg(open ? editingOrg : undefined)}
                isOpen={editingOrg !== undefined}
            >
                <Lead className="mb-4">{t("authTranslations.branch.edit.title")}</Lead>
                {editingOrg ? (
                    <BranchForm
                        branch={editingOrg}
                        onSuccess={() => setEditingOrg(undefined)}
                    />
                ) : null}
            </SystemDialog>
            <DropdownMenu>
                <DropdownMenuTrigger render={triggerButton} />
                <DropdownMenuContent
                    align="start"
                    side={isMobile ? "bottom" : "right"}
                    sideOffset={4}
                    className="w-fit"
                >
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>
                            {t("authTranslations.branch.create.title")}
                        </DropdownMenuLabel>
                        {branches.length === 0 ? (
                            <DropdownMenuItem disabled>
                                {t("authTranslations.branch.switcher.empty")}
                            </DropdownMenuItem>
                        ) : null}
                        {branches.map((branch) => (
                            <DropdownMenuSub key={branch.id}>
                                <DropdownMenuSubTrigger>
                                    <div className="flex-1 truncate">
                                        {locale === "ar" ? branch.nameAr : branch.nameEn}
                                    </div>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent alignOffset={-4} sideOffset={6}>
                                    <DropdownMenuItem
                                        disabled={isPending}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setActiveBranch(branch.id);
                                        }}
                                    >
                                        <ListStartIcon />
                                        {t("authTranslations.branch.switcher.setActive")}
                                    </DropdownMenuItem>
                                    {canManageBranches ? (
                                        <>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setEditingOrg(branch);
                                                }}
                                            >
                                                <EditIcon />
                                                {t("authTranslations.branch.switcher.edit")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setDeletingOrg(branch);
                                                }}
                                                variant="destructive"
                                            >
                                                <Trash2 />
                                                {t("common.delete")}
                                            </DropdownMenuItem>
                                        </>
                                    ) : null}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        ))}
                    </DropdownMenuGroup>
                    {canManageBranches ? (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    setOpenDialog("org:create");
                                }}
                            >
                                <Plus className="size-4" />
                                {t("authTranslations.branch.switcher.add")}
                            </DropdownMenuItem>
                        </>
                    ) : null}
                </DropdownMenuContent>
            </DropdownMenu>
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
