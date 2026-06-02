"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useId, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAppForm } from "@/components/forms/hooks";
import {
  OverlayFormBody,
  OverlayFormFooterActions,
  OverlayFormSubmitButton,
} from "@/components/forms/overlay-form";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { paymentMethods } from "@/drizzle/schemas/system/payments-table";
import { useTranslation } from "@/features/core/i18n/client";
import { reservationOutstanding } from "@/features/system/reservations/utils";
import { useTRPC } from "@/integrations/trpc/client";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";
import { formatCurrency } from "@/lib/format";

const paymentFormSchema = z.object({
  amount: z.number().int().min(1),
  paymentMethod: z.enum(paymentMethods),
  note: z.string().trim().max(500),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

type ReservationPaymentDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  reservation: ReservationGridRow | null;
};

export function ReservationPaymentDialog({
  onOpenChange,
  open,
  reservation,
}: ReservationPaymentDialogProps) {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const formId = useId();
  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";

  const outstanding = useMemo(
    () => (reservation ? reservationOutstanding(reservation) : 0),
    [reservation],
  );

  const collectMut = useMutation(
    trpc.reservations.collectPayment.mutationOptions(),
  );

  const methodOptions = useMemo(
    () =>
      paymentMethods.map((value) => ({
        value,
        label: String(
          t(
            value === "cash"
              ? "systemPages.paymentMethodCash"
              : value === "instapay"
                ? "systemPages.paymentMethodInstapay"
                : value === "mobileWallet"
                  ? "systemPages.paymentMethodMobileWallet"
                  : "systemPages.paymentMethodVisa",
          ),
        ),
      })),
    [t],
  );

  const form = useAppForm({
    defaultValues: {
      amount: outstanding,
      paymentMethod: "cash" as (typeof paymentMethods)[number],
      note: "",
    },
    validators: { onSubmit: paymentFormSchema },
    onSubmit: async ({ value }) => {
      if (!reservation) return;

      try {
        await toast
          .promise(
            collectMut.mutateAsync({
              reservationId: reservation.id,
              amount: value.amount,
              paymentMethod: value.paymentMethod,
              note: value.note?.trim() || undefined,
            }),
            {
              loading: String(t("common.saving")),
              success: String(t("systemPages.reservationPaymentCollected")),
              error: (err) =>
                err instanceof Error
                  ? err.message
                  : String(t("systemPages.reservationPaymentFailed")),
            },
          )
          .unwrap();

        await queryClient.invalidateQueries({
          queryKey: trpc.reservations.pathKey(),
        });
        onOpenChange(false);
      } catch {
        // surfaced by toast
      }
    },
  });

  const pending = collectMut.isPending;

  const handleBodySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  if (!reservation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-4 pt-4">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {String(t("systemPages.reservationsCollectPayment"))}
            <Badge variant={outstanding > 0 ? "destructive" : "default"}>
              {formatCurrency(outstanding, currencyLocale)}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {String(t("systemPages.reservationsInsurance"))}:{" "}
            {formatCurrency(reservation.insurance, currencyLocale)}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <OverlayFormBody
          formId={formId}
          className="space-y-4 px-4 py-4"
          onSubmit={handleBodySubmit}
        >
          <FieldSet disabled={pending || outstanding <= 0}>
            <FieldGroup>
              <form.AppField name="amount">
                {(field) => (
                  <field.NumberField
                    label={String(t("systemPages.reservationsPaymentAmount"))}
                  />
                )}
              </form.AppField>
              <form.AppField name="paymentMethod">
                {(field) => (
                  <field.SelectField
                    label={String(t("systemPages.reservationsPaymentMethod"))}
                    options={methodOptions}
                  />
                )}
              </form.AppField>
              <form.AppField name="note">
                {(field) => (
                  <field.StringField
                    label={String(t("systemPages.reservationsPaymentNote"))}
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </FieldSet>
        </OverlayFormBody>
        <DialogFooter className="shrink-0 border-t bg-muted px-4 py-4">
          <OverlayFormFooterActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {t("common.cancel")}
            </Button>
            <OverlayFormSubmitButton
              formId={formId}
              disabled={pending || outstanding <= 0}
            >
              {pending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : null}
              {String(t("systemPages.reservationsCollectPayment"))}
            </OverlayFormSubmitButton>
          </OverlayFormFooterActions>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
