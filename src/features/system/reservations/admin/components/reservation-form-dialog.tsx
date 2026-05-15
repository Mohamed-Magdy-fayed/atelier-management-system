"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Separator } from "@/components/ui/separator";
import { paymentMethods } from "@/drizzle/schemas/system/payments-table";
import { reservationStatuses } from "@/drizzle/schemas/system/reservations-table";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";

const reservationStatusSchema = z.enum(reservationStatuses);
const paymentMethodSchema = z.enum(paymentMethods);

const createFormSchema = z.object({
  dressId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(255),
  customerPhone: z.string().trim().min(1).max(32),
  receivingDateTime: z.string().min(1),
  returnDateTime: z.string().min(1),
  occasionDate: z.date(),
  depositPaid: z.number().int().min(100).max(10_000_000),
  discount: z.number().int().min(0).max(10_000_000),
  paymentMethod: paymentMethodSchema,
  status: reservationStatusSchema,
  notes: z.string().trim().max(4000).optional(),
});

const editFormSchema = z.object({
  reservationCode: z.string().trim().min(1).max(128),
  dressId: z.string().uuid(),
  customerId: z.string().uuid(),
  customerName: z.string().trim().min(1).max(255),
  customerPhone: z.string().trim().max(32).optional(),
  receivingDateTime: z.string().min(1),
  returnDateTime: z.string().min(1),
  occasionDate: z.date(),
  totalPrice: z.number().int().min(0).max(10_000_000),
  depositPaid: z.number().int().min(0).max(10_000_000),
  discount: z.number().int().min(0).max(10_000_000),
  status: reservationStatusSchema,
  notes: z.string().trim().max(4000).optional(),
});

type CreateFormValues = z.infer<typeof createFormSchema>;
type EditFormValues = z.infer<typeof editFormSchema>;

function toDatetimeLocalInput(value: Date | string) {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function statusOptionLabelKey(status: z.infer<typeof reservationStatusSchema>) {
  switch (status) {
    case "reserved":
      return "systemPages.reservationStatusReserved" as const;
    case "pickedUp":
      return "systemPages.reservationStatusPickedUp" as const;
    case "returned":
      return "systemPages.reservationStatusReturned" as const;
    case "cancelled":
      return "systemPages.reservationStatusCancelled" as const;
  }
}

type ReservationFormDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  reservation?: ReservationGridRow | null;
};

export function ReservationFormDialog({
  onOpenChange,
  open,
  reservation,
}: ReservationFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const branchState = useBranch();
  const isEdit = reservation != null;
  const branchId =
    reservation?.branchId ??
    (branchState?.hasActiveOrg ? branchState.activeBranch.id : undefined);
  const createMut = useMutation(trpc.reservations.create.mutationOptions());
  const updateMut = useMutation(trpc.reservations.update.mutationOptions());
  const { data: formData } = useQuery({
    ...trpc.reservations.formData.queryOptions({
      branchId: branchId ?? "",
    }),
    enabled: open && Boolean(branchId),
  });

  const dressOptions = useMemo(
    () =>
      (formData?.dresses ?? []).map((d) => ({
        value: d.id,
        label: `${d.title} (${d.code})`,
      })),
    [formData?.dresses],
  );

  const statusSelectOptions = useMemo(
    () =>
      reservationStatuses.map((value) => ({
        value,
        label: String(t(statusOptionLabelKey(value))),
      })),
    [t],
  );

  const paymentMethodOptions = useMemo(
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

  const createDefaults = useMemo<CreateFormValues>(
    () => ({
      dressId: "",
      customerName: "",
      customerPhone: "",
      receivingDateTime: "",
      returnDateTime: "",
      occasionDate: new Date(),
      depositPaid: 100,
      discount: 0,
      paymentMethod: "cash",
      status: "reserved",
      notes: "",
    }),
    [],
  );

  const editDefaults = useMemo<EditFormValues>(
    () => ({
      reservationCode: reservation?.reservationCode ?? "",
      dressId: reservation?.dressId ?? "",
      customerId: reservation?.customerId ?? "",
      customerName: reservation?.customerName ?? "",
      customerPhone: reservation?.customerPhone ?? "",
      receivingDateTime: reservation
        ? toDatetimeLocalInput(reservation.receivingDateTime)
        : "",
      returnDateTime: reservation
        ? toDatetimeLocalInput(reservation.returnDateTime)
        : "",
      occasionDate: reservation
        ? new Date(reservation.occasionDate)
        : new Date(),
      totalPrice: reservation?.totalPrice ?? 0,
      depositPaid: reservation?.depositPaid ?? 0,
      discount: reservation?.discount ?? 0,
      status: reservation?.status ?? "reserved",
      notes: reservation?.notes ?? "",
    }),
    [reservation],
  );

  const createForm = useAppForm({
    defaultValues: createDefaults,
    validators: { onSubmit: createFormSchema },
    onSubmit: async ({ value }) => {
      if (!branchId) {
        toast.error(String(t("systemPages.reservationBranchRequired")));
        return;
      }

      const receivingDateTime = new Date(value.receivingDateTime);
      const returnDateTime = new Date(value.returnDateTime);
      if (
        Number.isNaN(receivingDateTime.getTime()) ||
        Number.isNaN(returnDateTime.getTime())
      ) {
        toast.error(String(t("systemPages.reservationSaveFailed")));
        return;
      }

      try {
        await toast
          .promise(
            createMut.mutateAsync({
              branchId,
              dressId: value.dressId,
              customerName: value.customerName,
              customerPhone: value.customerPhone,
              receivingDateTime,
              occasionDate: value.occasionDate,
              returnDateTime,
              depositPaid: value.depositPaid,
              discount: value.discount,
              paymentMethod: value.paymentMethod,
              status: value.status,
              notes: value.notes?.trim() || undefined,
            }),
            {
              loading: String(t("common.saving")),
              success: String(t("systemPages.reservationCreated")),
              error: (err) =>
                err instanceof Error
                  ? err.message
                  : String(t("systemPages.reservationSaveFailed")),
            },
          )
          .unwrap();

        await queryClient.invalidateQueries({
          queryKey: trpc.reservations.pathKey(),
        });
        onOpenChange(false);
      } catch {
        // toast handles
      }
    },
  });

  const editForm = useAppForm({
    defaultValues: editDefaults,
    validators: { onSubmit: editFormSchema },
    onSubmit: async ({ value }) => {
      if (!branchId || !reservation) return;

      const receivingDateTime = new Date(value.receivingDateTime);
      const returnDateTime = new Date(value.returnDateTime);

      try {
        await toast
          .promise(
            updateMut.mutateAsync({
              id: reservation.id,
              branchId,
              dressId: value.dressId,
              customerId: value.customerId,
              reservationCode: value.reservationCode,
              customerName: value.customerName,
              customerPhone: value.customerPhone?.trim() || undefined,
              receivingDateTime,
              occasionDate: value.occasionDate,
              returnDateTime,
              totalPrice: value.totalPrice,
              depositPaid: value.depositPaid,
              discount: value.discount,
              status: value.status,
              notes: value.notes?.trim() || undefined,
            }),
            {
              loading: String(t("common.saving")),
              success: String(t("systemPages.reservationUpdated")),
              error: (err) =>
                err instanceof Error
                  ? err.message
                  : String(t("systemPages.reservationSaveFailed")),
            },
          )
          .unwrap();

        await queryClient.invalidateQueries({
          queryKey: trpc.reservations.pathKey(),
        });
        onOpenChange(false);
      } catch {
        // toast handles
      }
    },
  });

  const form = isEdit ? editForm : createForm;
  const pending = createMut.isPending || updateMut.isPending;
  const SubmitIcon = pending ? Loader2Icon : isEdit ? SaveIcon : PlusIcon;
  const formId = useId();

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      editForm.reset(editDefaults);
    } else {
      createForm.reset(createDefaults);
    }
  }, [open, reservation?.id, isEdit, createDefaults, editDefaults, createForm, editForm]);

  const handleBodySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  const formBody = isEdit ? (
    <FieldSet disabled={pending}>
      <FieldGroup>
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">
            {String(t("systemPages.reservationsCode"))}
          </p>
          <p className="font-medium text-sm">{reservation?.reservationCode}</p>
        </div>
        <editForm.AppField name="dressId">
          {(field) => (
            <field.SelectField
              label={String(t("systemPages.reservationsDress"))}
              options={dressOptions}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="customerName">
          {(field) => (
            <field.StringField
              label={String(t("systemPages.reservationsCustomerName"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="customerPhone">
          {(field) => (
            <field.StringField
              label={String(t("systemPages.reservationsCustomerPhone"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="receivingDateTime">
          {(field) => (
            <field.StringField
              inputType="datetime-local"
              label={String(t("systemPages.reservationsReceiving"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="occasionDate">
          {(field) => (
            <field.DateField
              label={String(t("systemPages.reservationsOccasion"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="returnDateTime">
          {(field) => (
            <field.StringField
              inputType="datetime-local"
              label={String(t("systemPages.reservationsReturn"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="totalPrice">
          {(field) => (
            <field.NumberField
              label={String(t("systemPages.reservationsTotalDue"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="discount">
          {(field) => (
            <field.NumberField
              label={String(t("systemPages.reservationsDiscount"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="depositPaid">
          {(field) => (
            <field.NumberField
              label={String(t("systemPages.reservationsDepositPaid"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="status">
          {(field) => (
            <field.SelectField
              label={String(t("systemPages.reservationsStatus"))}
              options={statusSelectOptions}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="notes">
          {(field) => (
            <field.StringField
              label={String(t("systemPages.reservationsNotes"))}
            />
          )}
        </editForm.AppField>
      </FieldGroup>
    </FieldSet>
  ) : (
    <FieldSet disabled={pending}>
      <FieldGroup>
        <p className="font-medium text-sm">
          {String(t("systemPages.reservationsFormStepDress"))}
        </p>
        <createForm.AppField name="dressId">
          {(field) => (
            <field.SelectField
              label={String(t("systemPages.reservationsDress"))}
              options={dressOptions}
            />
          )}
        </createForm.AppField>
        <createForm.AppField name="receivingDateTime">
          {(field) => (
            <field.StringField
              inputType="datetime-local"
              label={String(t("systemPages.reservationsReceiving"))}
            />
          )}
        </createForm.AppField>
        <createForm.AppField name="occasionDate">
          {(field) => (
            <field.DateField
              label={String(t("systemPages.reservationsOccasion"))}
            />
          )}
        </createForm.AppField>
        <createForm.AppField name="returnDateTime">
          {(field) => (
            <field.StringField
              inputType="datetime-local"
              label={String(t("systemPages.reservationsReturn"))}
            />
          )}
        </createForm.AppField>
        <Separator />
        <p className="font-medium text-sm">
          {String(t("systemPages.reservationsFormStepCustomer"))}
        </p>
        <createForm.AppField name="customerName">
          {(field) => (
            <field.StringField
              label={String(t("systemPages.reservationsCustomerName"))}
            />
          )}
        </createForm.AppField>
        <createForm.AppField name="customerPhone">
          {(field) => (
            <field.StringField
              label={String(t("systemPages.reservationsCustomerPhone"))}
            />
          )}
        </createForm.AppField>
        <Separator />
        <p className="font-medium text-sm">
          {String(t("systemPages.reservationsFormStepPayment"))}
        </p>
        <createForm.AppField name="depositPaid">
          {(field) => (
            <field.NumberField
              label={String(t("systemPages.reservationsDepositPaid"))}
            />
          )}
        </createForm.AppField>
        <createForm.AppField name="discount">
          {(field) => (
            <field.NumberField
              label={String(t("systemPages.reservationsDiscount"))}
            />
          )}
        </createForm.AppField>
        <createForm.AppField name="paymentMethod">
          {(field) => (
            <field.SelectField
              label={String(t("systemPages.reservationsPaymentMethod"))}
              options={paymentMethodOptions}
            />
          )}
        </createForm.AppField>
        <createForm.AppField name="status">
          {(field) => (
            <field.SelectField
              label={String(t("systemPages.reservationsStatus"))}
              options={statusSelectOptions}
            />
          )}
        </createForm.AppField>
        <createForm.AppField name="notes">
          {(field) => (
            <field.StringField
              label={String(t("systemPages.reservationsNotes"))}
            />
          )}
        </createForm.AppField>
      </FieldGroup>
    </FieldSet>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 px-4 pt-4">
          <DialogTitle>
            {String(
              t(
                isEdit
                  ? "systemPages.editReservation"
                  : "systemPages.addReservation",
              ),
            )}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit
                  ? "systemPages.editReservationDescription"
                  : "systemPages.addReservationDescription",
              ),
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 max-h-[min(70vh,520px)] flex-1 px-4 py-4">
          <OverlayFormBody
            formId={formId}
            className="space-y-4"
            onSubmit={handleBodySubmit}
          >
            {formBody}
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
