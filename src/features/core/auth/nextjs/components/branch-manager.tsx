"use client";

import {
    AlertTriangleIcon,
    BuildingIcon,
    EditIcon,
    ListStartIcon,
    Plus,
    Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ResponsiveDialog } from "@/components/general/responsive-dialog";
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
import { Lead } from "@/components/ui/typography";
import {
    deleteBranchAction,
    setActiveBranchForUserAction,
} from "@/features/core/auth/nextjs/actions";
import { BranchForm } from "@/features/core/auth/nextjs/components/branch-form";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { useIsMobile } from "@/hooks/use-mobile";

export function BranchManager() {
    const isMobile = useIsMobile();
    const { t, locale } = useTranslation();
    const { hasActiveOrg, branches, activeBranch } = useBranch();

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
            }

            toast.success(
                t("authTranslations.branch.actions.setActiveBranch.success"),
            );
        });
    }

    return (
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
            <ResponsiveDialog
                onOpenChange={(val) => setOpenDialog(val ? "org:create" : undefined)}
                open={openDialog === "org:create"}
            >
                <Lead className="mb-4">
                    {t("authTranslations.branch.create.title")}
                </Lead>
                <BranchForm onSuccess={() => setOpenDialog(undefined)} />
            </ResponsiveDialog>
            <ResponsiveDialog
                onOpenChange={(open) => setEditingOrg(open ? editingOrg : undefined)}
                open={editingOrg !== undefined}
            >
                <Lead className="mb-4">{t("authTranslations.branch.edit.title")}</Lead>
                {editingOrg ? (
                    <BranchForm
                        branch={editingOrg}
                        onSuccess={() => setEditingOrg(undefined)}
                    />
                ) : null}
            </ResponsiveDialog>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="outline"
                        >
                            <BuildingIcon className="text-primary" />
                            <span className="truncate font-medium">
                                {!hasActiveOrg
                                    ? t("authTranslations.branch.switcher.select")
                                    : locale === "ar"
                                        ? activeBranch.nameAr
                                        : activeBranch.nameEn}
                            </span>
                        </Button>
                    }
                />
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
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        ))}
                    </DropdownMenuGroup>
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
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
