"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DicesIcon, Loader2Icon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { FormBase } from "@/components/forms/form-base";
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
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { translationKey } from "@/features/core/i18n/global";
import { generateDressCode } from "@/features/system/dresses/lib/generate-dress-code";
import { useTRPC } from "@/integrations/trpc/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

import { DressImagesEditor } from "./dress-images-field";

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
    .array(
      z
        .string()
        .max(2048, translationKey("forms.validation.imageUrlMaxLen")),
    )
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
      description: dress?.description ?? "",
      images: dress?.images?.filter(Boolean) ?? [],
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

      const trimmedDescription = value.description?.trim();
      const payload = {
        branchId,
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
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
                  {(field) => {
                    const invalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
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
                            placeholder={String(
                              t("systemPages.dressesCodePlaceholder"),
                            )}
                            value={field.state.value}
                          />
                          <InputGroupAddon align="inline-end">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <InputGroupButton
                                    aria-label={String(
                                      t(
                                        "systemPages.dressesGenerateCodeAria",
                                      ),
                                    )}
                                    disabled={pending}
                                    size="icon-xs"
                                    type="button"
                                    variant="ghost"
                                    onClick={() =>
                                      field.setValue(generateDressCode())
                                    }
                                  >
                                    <DicesIcon className="size-3.5" />
                                  </InputGroupButton>
                                }
                              />
                              <TooltipContent>
                                <p>
                                  {String(
                                    t("systemPages.dressesGenerateCode"),
                                  )}
                                </p>
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
                      placeholder={String(
                        t("systemPages.dressesTitlePlaceholder"),
                      )}
                    />
                  )}
                </form.AppField>
                <form.AppField name="description">
                  {(field) => {
                    const invalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <FormBase
                        label={String(t("systemPages.dressesDescription"))}
                      >
                        <Textarea
                          aria-invalid={invalid}
                          id={field.name}
                          name={field.name}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder={String(
                            t("systemPages.dressesDescriptionPlaceholder"),
                          )}
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
