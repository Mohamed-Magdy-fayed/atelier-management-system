"use client";

import { AlertTriangleIcon } from "lucide-react";

import { SystemDialog } from "@/components/general/system-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { H4, Lead } from "@/components/ui/typography";
import { BranchForm } from "@/features/core/auth/nextjs/components/branch-form";
import { useTranslation } from "@/features/core/i18n/client";

import type { EditableBranch } from "./types";

type BranchManagerDialogsProps = {
  deletingBranch: EditableBranch | undefined;
  editingBranch: EditableBranch | undefined;
  isPending: boolean;
  onConfirmDelete: () => void;
  onOpenCreateChange: (open: boolean) => void;
  openCreateDialog: boolean;
  setDeletingBranch: (branch: EditableBranch | undefined) => void;
  setEditingBranch: (branch: EditableBranch | undefined) => void;
};

export function BranchManagerDialogs({
  deletingBranch,
  editingBranch,
  isPending,
  onConfirmDelete,
  onOpenCreateChange,
  openCreateDialog,
  setDeletingBranch,
  setEditingBranch,
}: BranchManagerDialogsProps) {
  const { t } = useTranslation();

  return (
    <>
      <AlertDialog
        onOpenChange={(open) => setDeletingBranch(open ? deletingBranch : undefined)}
        open={deletingBranch !== undefined}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="flex items-center justify-center gap-2">
            <AlertTriangleIcon />
            <AlertDialogTitle>{t("common.areYouSure")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction disabled={isPending} onClick={onConfirmDelete}>
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
        onOpenChange={onOpenCreateChange}
        isOpen={openCreateDialog}
      >
        <BranchForm onSuccess={() => onOpenCreateChange(false)} />
      </SystemDialog>
      <SystemDialog
        onOpenChange={(open) => setEditingBranch(open ? editingBranch : undefined)}
        isOpen={editingBranch !== undefined}
      >
        <Lead className="mb-4">{t("authTranslations.branch.edit.title")}</Lead>
        {editingBranch ? (
          <BranchForm
            branch={editingBranch}
            onSuccess={() => setEditingBranch(undefined)}
          />
        ) : null}
      </SystemDialog>
    </>
  );
}
