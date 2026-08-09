"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DicesIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { FormBase } from "@/components/forms/form-base";
import { useAppForm } from "@/components/forms/hooks";
import {
  OverlayFormBody,
  OverlayFormFooterActions,
  OverlayFormSubmitButton,
} from "@/components/forms/overlay-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/features/core/i18n/client";
import { translationKey } from "@/features/core/i18n/global";
import { useInvalidateDashboard } from "@/features/system/dashboard/lib/use-invalidate-dashboard";
import { generateDressCode } from "@/features/system/dresses/lib/generate-dress-code";
import { useBranchFieldOptions } from "@/features/system/shared/use-branch-field-options";
import { useTRPC } from "@/integrations/trpc/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

import { DressImagesEditor } from "./dress-images-field";

const DRESS_CURRENT_STATUSES = [
  "available",
  "atTailor",
  "atDryCleaner",
  "underRepair",
] as const;

type DressCurrentStatus = (typeof DRESS_CURRENT_STATUSES)[number];

const dressFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .max(128, translationKey("forms.validation.max128")),
  title: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .max(255, translationKey("forms.validation.max255")),
  description: z
    .string()
    .trim()
    .max(4000, translationKey("forms.validation.max4000"))
    .optional(),
  images: z
    .array(z.string().max(2048, translationKey("forms.validation.imageUrlMaxLen")))
    .max(20, translationKey("forms.validation.imagesMaxItems")),
  size: z
    .string()
    .trim()
    .max(64, translationKey("forms.validation.max64"))
    .optional(),
  color: z
    .string()
    .trim()
    .max(64, translationKey("forms.validation.max64"))
    .optional(),
  pricePerDay: z
    .number()
    .int(translationKey("forms.validation.numberIntMin0"))
    .min(0, translationKey("forms.validation.numberIntMin0"))
    .max(10_000_000, translationKey("forms.validation.numberIntMaxLarge")),
  depositAmount: z
    .number()
    .int(translationKey("forms.validation.numberIntMin0"))
    .min(0, translationKey("forms.validation.numberIntMin0"))
    .max(10_000_000, translationKey("forms.validation.numberIntMaxLarge")),
  insurance: z
    .number()
    .int(translationKey("forms.validation.numberIntMin0"))
    .min(0, translationKey("forms.validation.numberIntMin0"))
    .max(10_000_000, translationKey("forms.validation.numberIntMaxLarge")),
  isActive: z.boolean(),
  currentStatus: z.enum(DRESS_CURRENT_STATUSES).optional(),
  branchId: z.uuid(translationKey("forms.validation.required")),
});

type DressFormValues = z.infer<typeof dressFormSchema>;

type StatusExpensePrefill = {
  dressId: string;
  dressCode: string;
  type: "drycleaning" | "tailoring";
};

type DressFormDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  dress?: DressGridRow | null;
  onStatusNeedsExpense?: (prefill: StatusExpensePrefill) => void;
};

export function DressFormDialog({
  onOpenChange,
  open,
  dress,
  onStatusNeedsExpense,
}: DressFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateDashboard = useInvalidateDashboard();
  const { options: branchOptions, defaultBranchId } = useBranchFieldOptions();
  const isEdit = dress != null;

  const createMut = useMutation(trpc.dresses.create.mutationOptions());
  const updateMut = useMutation(trpc.dresses.update.mutationOptions());
  const updateStatusMut = useMutation(trpc.dresses.updateStatus.mutationOptions());

  const [pendingExpense, setPendingExpense] = useState<StatusExpensePrefill | null>(null);

  const defaultValues = useMemo<DressFormValues>(
    () => ({
      code: dress?.code ?? "",
      title: dress?.title ?? "",
      description: dress?.description ?? "",
      images: dress?.images?.filter(Boolean) ?? [],
      size: dress?.size ?? "",
      color: dress?.color ?? "",
      pricePerDay: dress?.pricePerDay ?? 0,
      depositAmount: dress?.depositAmount ?? 0,
      insurance: dress?.insurance ?? 0,
      isActive: dress?.isActive ?? true,
      currentStatus: dress?.currentStatus ?? "available",
      branchId: dress?.branchId ?? defaultBranchId,
    }),
    [dress, defaultBranchId],
  );

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: dressFormSchema },
    onSubmit: async ({ value }) => {
      const trimmedDescription = value.description?.trim();
      const payload = {
        branchId: value.branchId,
        code: value.code,
        title: value.title,
        description: trimmedDescription ? trimmedDescription : undefined,
        images: value.images.filter(Boolean),
        size: value.size?.trim() ? value.size.trim() : undefined,
        color: value.color?.trim() ? value.color.trim() : undefined,
        pricePerDay: value.pricePerDay,
        depositAmount: value.depositAmount,
        insurance: value.insurance,
        isActive: value.isActive,
      };

      const mainAction: Promise<unknown> =
        isEdit && dress
          ? updateMut.mutateAsync({ id: dress.id, ...payload })
          : createMut.mutateAsync(payload);

      try {
        await toast
          .promise(mainAction, {
            loading: String(t("common.saving")),
            success: String(t(isEdit ? "systemPages.dressUpdated" : "systemPages.dressCreated")),
            error: (err) =>
              err instanceof Error ? err.message : String(t("systemPages.dressSaveFailed")),
          })
          .unwrap();

        const newStatus = value.currentStatus as DressCurrentStatus | undefined;
        const oldStatus = dress?.currentStatus;

        if (isEdit && dress && newStatus && newStatus !== oldStatus) {
          await updateStatusMut.mutateAsync({ id: dress.id, currentStatus: newStatus });
        }

        await queryClient.invalidateQueries({ queryKey: trpc.dresses.pathKey() });
        await invalidateDashboard();

        if (
          isEdit &&
          dress &&
          newStatus &&
          newStatus !== oldStatus &&
          (newStatus === "atTailor" || newStatus === "atDryCleaner")
        ) {
          const prefill: StatusExpensePrefill = {
            dressId: dress.id,
            dressCode: dress.code,
            type: newStatus === "atTailor" ? "tailoring" : "drycleaning",
          };
          if (onStatusNeedsExpense) {
            onOpenChange(false);
            onStatusNeedsExpense(prefill);
          } else {
            setPendingExpense(prefill);
          }
        } else {
          onOpenChange(false);
        }
      } catch {
        // toast.promise already surfaced the failure.
      }
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
  }, [open, defaultValues, form.reset]);

  const pending = createMut.isPending || updateMut.isPending || updateStatusMut.isPending;
  const SubmitIcon = pending ? Loader2Icon : isEdit ? SaveIcon : PlusIcon;
  const formId = useId();

  const handleBodySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  const statusOptions = DRESS_CURRENT_STATUSES.map((s) => ({
    value: s,
    label: String(
      t(
        s === "available"
          ? "systemPages.dressCurrentStatusAvailable"
          : s === "atTailor"
            ? "systemPages.dressCurrentStatusAtTailor"
            : s === "atDryCleaner"
              ? "systemPages.dressCurrentStatusAtDryCleaner"
              : "systemPages.dressCurrentStatusUnderRepair",
      ),
    ),
  }));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 px-4 pt-4">
            <DialogTitle>
              {String(t(isEdit ? "systemPages.editDress" : "systemPages.addDress"))}
            </DialogTitle>
            <DialogDescription>
              {String(t(isEdit ? "systemPages.editDressDescription" : "systemPages.addDressDescription"))}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="min-h-0 flex-1 px-4 py-4">
            <OverlayFormBody formId={formId} className="space-y-4" onSubmit={handleBodySubmit}>
              <FieldSet disabled={pending}>
                <FieldGroup>
                  <form.AppField name="branchId">
                    {(field) => (
                      <field.SelectField
                        label={String(t("systemPages.formBranch"))}
                        placeholder={String(t("systemPages.formBranchPlaceholder"))}
                        options={branchOptions}
                        disabled={isEdit}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="code">
                    {(field) => {
                      const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <FormBase label={String(t("systemPages.dressesCode"))}>
                          <InputGroup>
                            <InputGroupInput
                              data-slot="input-group-control"
                              aria-invalid={invalid}
                              autoComplete="off"
                              autoFocus
                              id={field.name}
                              name={field.name}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                              placeholder={String(t("systemPages.dressesCodePlaceholder"))}
                              value={field.state.value}
                            />
                            <InputGroupAddon align="inline-end">
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <InputGroupButton
                                      aria-label={String(t("systemPages.dressesGenerateCodeAria"))}
                                      disabled={pending}
                                      size="icon-xs"
                                      type="button"
                                      variant="ghost"
                                      onClick={() => field.setValue(generateDressCode())}
                                    >
                                      <DicesIcon className="size-3.5" />
                                    </InputGroupButton>
                                  }
                                />
                                <TooltipContent>
                                  <p>{String(t("systemPages.dressesGenerateCode"))}</p>
                                </TooltipContent>
                              </Tooltip>
                            </InputGroupAddon>
                          </InputGroup>
                        </FormBase>
                      );
                    }}
                  </form.AppField>
                  <form.AppField name="title">
                    {(field) => (
                      <field.StringField
                        label={String(t("systemPages.dressesTitleCol"))}
                        placeholder={String(t("systemPages.dressesTitlePlaceholder"))}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="description">
                    {(field) => {
                      const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
                      return (
                        <FormBase label={String(t("systemPages.dressesDescription"))}>
                          <Textarea
                            aria-invalid={invalid}
                            id={field.name}
                            name={field.name}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder={String(t("systemPages.dressesDescriptionPlaceholder"))}
                            rows={3}
                            value={field.state.value ?? ""}
                          />
                        </FormBase>
                      );
                    }}
                  </form.AppField>
                  <form.AppField name="images">
                    {(field) => (
                      <FormBase label={String(t("systemPages.dressesImages"))}>
                        <DressImagesEditor
                          disabled={pending}
                          urls={field.state.value}
                          onUrlsChange={field.handleChange}
                        />
                      </FormBase>
                    )}
                  </form.AppField>
                  <Separator />
                  <form.AppField name="size">
                    {(field) => (
                      <field.StringField
                        label={String(t("systemPages.dressesSize"))}
                        placeholder={String(t("systemPages.dressesSize"))}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="color">
                    {(field) => (
                      <field.StringField
                        label={String(t("systemPages.dressesColor"))}
                        placeholder={String(t("systemPages.dressesColor"))}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="pricePerDay">
                    {(field) => (
                      <field.NumberField label={String(t("systemPages.dressesPricePerDay"))} />
                    )}
                  </form.AppField>
                  <form.AppField name="depositAmount">
                    {(field) => (
                      <field.NumberField label={String(t("systemPages.dressesDeposit"))} />
                    )}
                  </form.AppField>
                  <form.AppField name="insurance">
                    {(field) => (
                      <field.NumberField label={String(t("systemPages.dressesInsurance"))} />
                    )}
                  </form.AppField>
                  <form.AppField name="isActive">
                    {(field) => (
                      <field.BooleanField label={String(t("systemPages.dressesActiveLabel"))} />
                    )}
                  </form.AppField>
                  {isEdit ? (
                    <>
                      <Separator />
                      <form.AppField name="currentStatus">
                        {(field) => (
                          <field.SelectField
                            label={String(t("systemPages.dressCurrentStatus"))}
                            options={statusOptions}
                          />
                        )}
                      </form.AppField>
                    </>
                  ) : null}
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
                className="min-w-0 flex-1"
                disabled={pending}
                formId={formId}
                size="default"
              >
                <SubmitIcon className={pending ? "size-3.5 animate-spin" : "size-3.5"} />
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

      <AlertDialog
        open={!!pendingExpense}
        onOpenChange={(open) => {
          if (!open) {
            setPendingExpense(null);
            onOpenChange(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {String(t("systemPages.dressCreateExpensePrompt"))}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {String(
                t("systemPages.dressCreateExpenseDescription", {
                  type: pendingExpense
                    ? String(
                        t(
                          pendingExpense.type === "tailoring"
                            ? "systemPages.expenseTypeTailoring"
                            : "systemPages.expenseTypeDrycleaning",
                        ),
                      )
                    : "",
                  dress: pendingExpense?.dressCode ?? "",
                }),
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingExpense(null);
                onOpenChange(false);
              }}
            >
              {String(t("common.cancel"))}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingExpense) return;
                onStatusNeedsExpense?.(pendingExpense);
                setPendingExpense(null);
                onOpenChange(false);
              }}
            >
              {String(t("common.yes"))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
