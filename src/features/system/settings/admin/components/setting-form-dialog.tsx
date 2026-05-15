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
import { settingsLabels } from "@/drizzle/schemas/system/settings-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { SettingGridRow } from "@/integrations/trpc/routers/settings";

const isActiveValues = ["", "true", "false"] as const;

const settingFormSchema = z.object({
  code: z.string().trim().min(1).max(128),
  label: z.enum(settingsLabels),
  description: z.string().trim().max(4000).optional(),
  isActive: z.enum(isActiveValues),
  value: z.string().trim().max(8000).optional(),
  amount: z
    .string()
    .optional()
    .superRefine((raw, ctx) => {
      if (!raw?.trim()) return;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 10_000_000) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid amount",
        });
      }
    }),
});

type SettingFormValues = z.infer<typeof settingFormSchema>;

type SettingFormDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  setting?: SettingGridRow | null;
};

function mapIsActiveToForm(
  v: boolean | null | undefined,
): (typeof isActiveValues)[number] {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
}

function mapIsActiveToPayload(
  v: (typeof isActiveValues)[number],
): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

export function SettingFormDialog({
  onOpenChange,
  open,
  setting,
}: SettingFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEdit = setting != null;

  const createMut = useMutation(trpc.settings.create.mutationOptions());
  const updateMut = useMutation(trpc.settings.update.mutationOptions());

  const labelSelectOptions = useMemo(
    () =>
      settingsLabels.map((value) => ({
        value,
        label: String(
          t(
            value === "policy"
              ? "systemPages.settingsLabelPolicy"
              : "systemPages.settingsLabelIntegration",
          ),
        ),
      })),
    [t],
  );

  const isActiveSelectOptions = useMemo(
    () => [
      {
        value: "",
        label: String(t("systemPages.settingsIsActiveUnset")),
      },
      {
        value: "true",
        label: String(t("systemPages.settingsStateEnabled")),
      },
      {
        value: "false",
        label: String(t("systemPages.settingsStateDisabled")),
      },
    ],
    [t],
  );

  const defaultValues = useMemo<SettingFormValues>(
    () => ({
      code: setting?.code ?? "",
      label: (setting?.label as (typeof settingsLabels)[number]) ?? "policy",
      description: setting?.description ?? "",
      isActive: mapIsActiveToForm(setting?.isActive),
      value: setting?.value ?? "",
      amount:
        setting?.amount != null && setting.amount !== null
          ? String(setting.amount)
          : "",
    }),
    [setting],
  );

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: settingFormSchema },
    onSubmit: async ({ value }) => {
      const amountTrim = value.amount?.trim();
      const amount =
        amountTrim && amountTrim.length > 0 ? Number(amountTrim) : null;

      const action: Promise<unknown> =
        isEdit && setting
          ? updateMut.mutateAsync({
              id: setting.id,
              label: value.label,
              description: value.description?.trim() || null,
              isActive: mapIsActiveToPayload(value.isActive),
              value: value.value?.trim() || null,
              amount,
            })
          : createMut.mutateAsync({
              code: value.code,
              label: value.label,
              description: value.description?.trim() || null,
              isActive: mapIsActiveToPayload(value.isActive),
              value: value.value?.trim() || null,
              amount,
            });

      try {
        await toast
          .promise(action, {
            loading: String(t("common.saving")),
            success: String(
              t(
                isEdit
                  ? "systemPages.settingUpdated"
                  : "systemPages.settingCreated",
              ),
            ),
            error: (err) =>
              err instanceof Error
                ? err.message
                : String(t("systemPages.settingSaveFailed")),
          })
          .unwrap();
        await queryClient.invalidateQueries({
          queryKey: trpc.settings.pathKey(),
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
  }, [open, setting?.id]);

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
              t(isEdit ? "systemPages.editSetting" : "systemPages.addSetting"),
            )}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit
                  ? "systemPages.editSettingDescription"
                  : "systemPages.addSettingDescription",
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
                {!isEdit ? (
                  <form.AppField name="code">
                    {(field) => (
                      <field.StringField
                        label={String(t("systemPages.settingsCode"))}
                        placeholder={String(
                          t("systemPages.settingsCodePlaceholder"),
                        )}
                        autoFocus
                      />
                    )}
                  </form.AppField>
                ) : setting ? (
                  <div className="space-y-1.5 text-sm">
                    <div className="font-medium text-foreground">
                      {String(t("systemPages.settingsCode"))}
                    </div>
                    <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
                      {setting.code}
                    </div>
                  </div>
                ) : null}
                <form.AppField name="label">
                  {(field) => (
                    <field.SelectField
                      label={String(t("systemPages.settingsCategory"))}
                      options={labelSelectOptions}
                    />
                  )}
                </form.AppField>
                <form.AppField name="description">
                  {(field) => (
                    <field.StringField
                      label={String(t("forms.description"))}
                      placeholder={String(
                        t("systemPages.settingsDescriptionPlaceholder"),
                      )}
                    />
                  )}
                </form.AppField>
                <form.AppField name="isActive">
                  {(field) => (
                    <field.SelectField
                      label={String(t("systemPages.settingsIsActive"))}
                      options={isActiveSelectOptions}
                    />
                  )}
                </form.AppField>
                <form.AppField name="value">
                  {(field) => (
                    <field.StringField
                      label={String(t("systemPages.settingsValue"))}
                      placeholder={String(
                        t("systemPages.settingsValuePlaceholder"),
                      )}
                    />
                  )}
                </form.AppField>
                <form.AppField name="amount">
                  {(field) => (
                    <field.StringField
                      label={String(t("systemPages.settingsAmount"))}
                      placeholder={String(
                        t("systemPages.settingsAmountPlaceholder"),
                      )}
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
              disabled={pending}
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
