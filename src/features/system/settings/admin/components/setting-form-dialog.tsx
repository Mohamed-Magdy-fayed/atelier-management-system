"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, SaveIcon, XIcon } from "lucide-react";
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
import { Muted } from "@/components/ui/typography";
import { useTranslation } from "@/features/core/i18n/client";
import { translationKey } from "@/features/core/i18n/global";
import {
  getSettingDisplayDescription,
  getSettingDisplayName,
} from "@/features/system/settings/lib/setting-i18n";
import {
  getSystemSettingDefinition,
  SYSTEM_SETTING_CODE,
} from "@/features/system/settings/lib/system-settings-registry";
import { useTRPC } from "@/integrations/trpc/client";
import type { SettingGridRow } from "@/integrations/trpc/routers/settings";

const isActiveValues = ["", "true", "false"] as const;

type SettingFormDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  setting: SettingGridRow | null;
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

const settingFormSchema = z.object({
  isActive: z.enum(isActiveValues),
  value: z
    .string()
    .trim()
    .max(8000, translationKey("forms.validation.max8000")),
  amount: z
    .string()
    .optional()
    .superRefine((raw, ctx) => {
      if (!raw?.trim()) return;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0 || n > 10_000_000) {
        ctx.addIssue({
          code: "custom",
          message: translationKey("forms.validation.invalidAmount"),
        });
      }
    }),
});

type SettingFormValues = z.infer<typeof settingFormSchema>;

export function SettingFormDialog({
  onOpenChange,
  open,
  setting,
}: SettingFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const updateMut = useMutation(trpc.settings.update.mutationOptions());

  const definition = setting ? getSystemSettingDefinition(setting.code) : null;

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

  const defaultValues = useMemo<SettingFormValues>(() => {
    if (!setting) {
      return { isActive: "", value: "", amount: "" };
    }
    return {
      isActive: mapIsActiveToForm(setting.isActive),
      value: setting.value ?? "",
      amount: setting.amount != null ? String(setting.amount) : "",
    };
  }, [setting]);

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: settingFormSchema },
    onSubmit: async ({ value }) => {
      if (!setting || !definition) return;

      const amountTrim = value.amount?.trim();
      const amount =
        definition.editable.amount && amountTrim && amountTrim.length > 0
          ? Number(amountTrim)
          : definition.editable.amount
            ? null
            : undefined;

      try {
        await toast
          .promise(
            updateMut.mutateAsync({
              id: setting.id,
              ...(definition.editable.isActive
                ? { isActive: mapIsActiveToPayload(value.isActive ?? "") }
                : {}),
              ...(definition.editable.value
                ? { value: value.value?.trim() || null }
                : {}),
              ...(definition.editable.amount ? { amount } : {}),
            }),
            {
              loading: String(t("common.saving")),
              success: String(t("systemPages.settingUpdated")),
              error: (err) =>
                err instanceof Error
                  ? err.message
                  : String(t("systemPages.settingSaveFailed")),
            },
          )
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
    if (open && setting) {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setting?.id]);

  const pending = updateMut.isPending;
  const formId = useId();

  const handleBodySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  if (!setting || !definition) {
    return null;
  }

  const displayName = getSettingDisplayName(setting.code, t);
  const displayDescription = getSettingDisplayDescription(setting.code, t);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-4 pt-4">
          <DialogTitle>{String(t("systemPages.editSetting"))}</DialogTitle>
          <DialogDescription>
            {String(t("systemPages.editSettingDescription"))}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <OverlayFormBody
            formId={formId}
            className="space-y-4"
            onSubmit={handleBodySubmit}
          >
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="space-y-1">
                <div className="font-medium text-foreground">
                  {String(t("systemPages.settingsCode"))}
                </div>
                <div className="font-mono text-xs">{setting.code}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-foreground">
                  {String(t("systemPages.settingsName"))}
                </div>
                <div>{displayName}</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-foreground">
                  {String(t("forms.description"))}
                </div>
                <Muted className="text-xs leading-relaxed">
                  {displayDescription}
                </Muted>
              </div>
            </div>
            <FieldSet disabled={pending}>
              <FieldGroup>
                {definition.editable.isActive ? (
                  <form.AppField name="isActive">
                    {(field) => (
                      <field.SelectField
                        label={String(
                          t(
                            setting.code ===
                              SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES
                              ? "systemPages.settingsShowPricesState"
                              : "systemPages.settingsIsActive",
                          ),
                        )}
                        options={isActiveSelectOptions}
                      />
                    )}
                  </form.AppField>
                ) : null}
                {definition.editable.value ? (
                  <form.AppField name="value">
                    {(field) =>
                      setting.code ===
                      SYSTEM_SETTING_CODE.RESERVATION_USAGE_POLICY ? (
                        <field.TextareaField
                          label={String(t("systemPages.settingsValue"))}
                          placeholder={String(
                            t("systemPages.settingsValuePlaceholder"),
                          )}
                        />
                      ) : (
                        <field.StringField
                          label={String(t("systemPages.settingsValue"))}
                          placeholder={String(
                            t("systemPages.settingsValuePlaceholder"),
                          )}
                        />
                      )
                    }
                  </form.AppField>
                ) : null}
                {definition.editable.amount ? (
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
              formId={formId}
              size="default"
              disabled={pending}
            >
              {pending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <SaveIcon className="size-3.5" />
              )}
              {pending
                ? String(t("common.saving"))
                : String(t("common.save"))}
            </OverlayFormSubmitButton>
          </OverlayFormFooterActions>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
