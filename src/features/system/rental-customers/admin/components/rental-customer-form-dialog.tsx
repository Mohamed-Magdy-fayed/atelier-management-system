"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef } from "react";
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
import { useTranslation } from "@/features/core/i18n/client";
import { translationKey } from "@/features/core/i18n/global";
import { useInvalidateDashboard } from "@/features/system/dashboard/lib/use-invalidate-dashboard";
import { useTRPC } from "@/integrations/trpc/client";
import type { RentalCustomerGridRow } from "@/integrations/trpc/routers/rental-customers";

const rentalCustomerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .max(256, translationKey("forms.validation.max255")),
  phone: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .max(32, translationKey("forms.validation.max255")),
  note: z
    .string()
    .trim()
    .max(1000, translationKey("forms.validation.max4000"))
    .optional(),
});

type RentalCustomerFormValues = z.infer<typeof rentalCustomerFormSchema>;

type RentalCustomerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: RentalCustomerGridRow | null;
};

/**
 * Edit-only. Customers are still created implicitly by a reservation or a CSV
 * import, and reservations reference them, so neither create nor delete is
 * offered here.
 */
export function RentalCustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: RentalCustomerFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateDashboard = useInvalidateDashboard();

  const updateMut = useMutation(trpc.rentalCustomers.update.mutationOptions());

  const defaultValues = useMemo<RentalCustomerFormValues>(
    () => ({
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      note: customer?.note ?? undefined,
    }),
    [customer],
  );

  // What the form is currently editing. Reopening the same customer keeps
  // whatever was typed; a successful save clears the ref so the next open is
  // fresh. Same trick as the expenses dialog.
  const formIdentity = customer?.id ?? "none";
  const resetForRef = useRef<string | null>(null);

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: rentalCustomerFormSchema },
    onSubmit: async ({ value }) => {
      if (!customer) return;

      try {
        await toast
          .promise(
            updateMut.mutateAsync({
              id: customer.id,
              name: value.name.trim(),
              phone: value.phone.trim(),
              note: value.note?.trim() || null,
            }),
            {
              loading: String(t("common.saving")),
              success: String(t("systemPages.customerUpdated")),
              error: (err) =>
                err instanceof Error
                  ? err.message
                  : String(t("systemPages.customerSaveFailed")),
            },
          )
          .unwrap();

        await queryClient.invalidateQueries({
          queryKey: trpc.rentalCustomers.pathKey(),
        });
        // The dashboard's customer counts and top-customers list read the name.
        await invalidateDashboard();

        resetForRef.current = null;
        onOpenChange(false);
      } catch {
        // toast.promise surfaced the error
      }
    },
  });

  useEffect(() => {
    if (!open) return;
    if (resetForRef.current === formIdentity) return;
    resetForRef.current = formIdentity;
    form.reset(defaultValues);
  }, [open, formIdentity, defaultValues, form.reset]);

  const pending = updateMut.isPending;
  const formId = useId();

  const handleBodySubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-4 pt-4">
          <DialogTitle>{String(t("systemPages.editCustomer"))}</DialogTitle>
          <DialogDescription>
            {String(t("systemPages.editCustomerDescription"))}
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
                <form.AppField name="name">
                  {(field) => (
                    <field.StringField
                      label={String(t("forms.name"))}
                      placeholder={String(t("forms.namePlaceholder"))}
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="phone">
                  {(field) => (
                    <field.MobileField label={String(t("forms.phone"))} />
                  )}
                </form.AppField>
                <form.AppField name="note">
                  {(field) => (
                    <field.TextareaField
                      label={String(t("systemPages.customersNote"))}
                      placeholder=""
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
              {String(t("common.cancel"))}
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
              {pending ? String(t("common.saving")) : String(t("common.save"))}
            </OverlayFormSubmitButton>
          </OverlayFormFooterActions>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
