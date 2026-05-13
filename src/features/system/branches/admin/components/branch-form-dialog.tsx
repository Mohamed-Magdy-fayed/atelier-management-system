"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { BranchGridRow } from "@/integrations/trpc/routers/branches";

const branchFormSchema = z.object({
  nameEn: z.string().trim().min(1).max(128),
  nameAr: z.string().trim().min(1).max(128),
});

type BranchFormValues = z.infer<typeof branchFormSchema>;

type BranchFormDialogProps = {
  branch?: BranchGridRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function BranchFormDialog({
  branch,
  onOpenChange,
  open,
}: BranchFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEdit = branch != null;

  const createMut = useMutation(trpc.branches.create.mutationOptions());
  const updateMut = useMutation(trpc.branches.update.mutationOptions());

  const defaultValues = useMemo<BranchFormValues>(
    () => ({
      nameEn: branch?.nameEn ?? "",
      nameAr: branch?.nameAr ?? "",
    }),
    [branch],
  );

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: branchFormSchema },
    onSubmit: async ({ value }) => {
      const action: Promise<unknown> = isEdit && branch
        ? updateMut.mutateAsync({ id: branch.id, ...value })
        : createMut.mutateAsync(value);

      try {
        await toast.promise(action, {
          loading: String(t("common.saving")),
          success: String(
            t(isEdit ? "systemPages.branchUpdated" : "systemPages.branchCreated"),
          ),
          error: (err) =>
            err instanceof Error
              ? err.message
              : String(t("systemPages.branchSaveFailed")),
        }).unwrap();
        await queryClient.invalidateQueries({
          queryKey: trpc.branches.pathKey(),
        });
        onOpenChange(false);
      } catch {
        // toast.promise already surfaced the failure.
      }
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branch?.id]);

  const pending = createMut.isPending || updateMut.isPending;
  const SubmitIcon = pending ? Loader2Icon : isEdit ? SaveIcon : PlusIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {String(t(isEdit ? "systemPages.editBranch" : "systemPages.addBranch"))}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit
                  ? "systemPages.editBranchDescription"
                  : "systemPages.addBranchDescription",
              ),
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldSet disabled={pending}>
            <FieldGroup>
              <form.AppField name="nameEn">
                {(field) => (
                  <field.StringField
                    label={String(t("systemPages.branchesNameEn"))}
                    placeholder={String(t("authTranslations.branch.create.namePlaceholder"))}
                    autoFocus
                  />
                )}
              </form.AppField>
              <form.AppField name="nameAr">
                {(field) => (
                  <field.StringField
                    label={String(t("systemPages.branchesNameAr"))}
                    placeholder={String(t("authTranslations.branch.create.namePlaceholder"))}
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </FieldSet>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              <XIcon className="size-3.5" />
              {String(t("common.cancel"))}
            </Button>
            <Button type="submit" size="default" disabled={pending}>
              <SubmitIcon
                className={pending ? "size-3.5 animate-spin" : "size-3.5"}
              />
              {pending
                ? String(t("common.saving"))
                : isEdit
                  ? String(t("common.save"))
                  : String(t("common.create"))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
