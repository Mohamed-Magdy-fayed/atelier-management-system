"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAppForm } from "@/components/forms/hooks";
import {
  OverlayFormBody,
  OverlayFormFooterActions,
  OverlayFormSubmitButton,
} from "@/components/forms/overlay-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

const dressFormSchema = z.object({
  code: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(255),
  size: z.string().trim().max(64).optional(),
  color: z.string().trim().max(64).optional(),
  pricePerDay: z.number().int().min(0).max(10_000_000),
  depositAmount: z.number().int().min(0).max(10_000_000),
  insurance: z.number().int().min(0).max(10_000_000),
  isActive: z.boolean(),
});

type DressFormValues = z.infer<typeof dressFormSchema>;

type DressFormDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  dress?: DressGridRow | null;
};

export function DressFormDialog({
  onOpenChange,
  open,
  dress,
}: DressFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const branchState = useBranch();
  const isEdit = dress != null;
  const branchId =
    dress?.branchId ??
    (branchState?.hasActiveOrg ? branchState.activeBranch.id : undefined);

  const createMut = useMutation(trpc.dresses.create.mutationOptions());
  const updateMut = useMutation(trpc.dresses.update.mutationOptions());

  const defaultValues = useMemo<DressFormValues>(
    () => ({
      code: dress?.code ?? "",
      title: dress?.title ?? "",
      size: dress?.size ?? "",
      color: dress?.color ?? "",
      pricePerDay: dress?.pricePerDay ?? 0,
      depositAmount: dress?.depositAmount ?? 0,
      insurance: dress?.insurance ?? 0,
      isActive: dress?.isActive ?? true,
    }),
    [dress],
  );

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: dressFormSchema },
    onSubmit: async ({ value }) => {
      if (!branchId) {
        toast.error(String(t("systemPages.dressBranchRequired")));
        return;
      }

      const payload = { ...value, branchId };
      const action: Promise<unknown> =
        isEdit && dress
          ? updateMut.mutateAsync({ id: dress.id, ...payload })
          : createMut.mutateAsync(payload);

      try {
        await toast
          .promise(action, {
            loading: String(t("common.saving")),
            success: String(
              t(
                isEdit
                  ? "systemPages.dressUpdated"
                  : "systemPages.dressCreated",
              ),
            ),
            error: (err) =>
              err instanceof Error
                ? err.message
                : String(t("systemPages.dressSaveFailed")),
          })
          .unwrap();
        await queryClient.invalidateQueries({
          queryKey: trpc.dresses.pathKey(),
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
  }, [open, dress?.id]);

  const pending = createMut.isPending || updateMut.isPending;
  const SubmitIcon = pending ? Loader2Icon : isEdit ? SaveIcon : PlusIcon;
  const formId = useId();

  const handleBodySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-4 pt-4">
          <DialogTitle>
            {String(
              t(isEdit ? "systemPages.editDress" : "systemPages.addDress"),
            )}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit
                  ? "systemPages.editDressDescription"
                  : "systemPages.addDressDescription",
              ),
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <OverlayFormBody
            formId={formId}
            className="space-y-4"
            onSubmit={handleBodySubmit}
          >
            <FieldSet disabled={pending}>
              <FieldGroup>
                <form.AppField name="code">
                  {(field) => (
                    <field.StringField
                      label={String(t("systemPages.dressesCode"))}
                      placeholder={String(
                        t("systemPages.dressesCodePlaceholder"),
                      )}
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="title">
                  {(field) => (
                    <field.StringField
                      label={String(t("systemPages.dressesTitleCol"))}
                      placeholder={String(
                        t("systemPages.dressesTitlePlaceholder"),
                      )}
                    />
                  )}
                </form.AppField>
                <form.AppField name="pricePerDay">
                  {(field) => (
                    <field.NumberField
                      label={String(t("systemPages.dressesPricePerDay"))}
                    />
                  )}
                </form.AppField>
                <form.AppField name="depositAmount">
                  {(field) => (
                    <field.NumberField
                      label={String(t("systemPages.dressesDeposit"))}
                    />
                  )}
                </form.AppField>
                <form.AppField name="insurance">
                  {(field) => (
                    <field.NumberField
                      label={String(t("systemPages.dressesInsurance"))}
                    />
                  )}
                </form.AppField>
                <form.AppField name="isActive">
                  {(field) => (
                    <field.BooleanField
                      label={String(t("systemPages.dressesActiveLabel"))}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
            </FieldSet>
          </OverlayFormBody>
        </ScrollArea>
        <DialogFooter className="shrink-0 border-t bg-muted px-4 py-4 sm:flex-row sm:justify-end">
          <OverlayFormFooterActions>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              <XIcon className="size-3.5" />
              {t("common.cancel")}
            </Button>
            <OverlayFormSubmitButton
              formId={formId}
              size="default"
              disabled={pending || !branchId}
            >
              <SubmitIcon
                className={pending ? "size-3.5 animate-spin" : "size-3.5"}
              />
              {pending
                ? String(t("common.saving"))
                : isEdit
                  ? String(t("common.save"))
                  : String(t("common.create"))}
            </OverlayFormSubmitButton>
          </OverlayFormFooterActions>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
