"use client";

import { useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAppForm } from "@/components/forms/hooks";
import { translateZodIssueMessages } from "@/components/forms/validation-messages";
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
import { paymentMethods } from "@/drizzle/schemas/system/payments-table";
import { reservationStatuses } from "@/drizzle/schemas/system/reservations-table";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { translationKey } from "@/features/core/i18n/global";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";
import { formatCurrency } from "@/lib/format";

import { mapToReceiptProps } from "../../lib/receipt/map-receipt-props";
import {
  buildDefaultReservationDatetimes,
  syncReceivingReturnFromOccasion,
} from "../../lib/reservation-datetime-defaults";
import { isOccasionDayBlocked } from "../../lib/occasion-day-availability";
import { ReservationDressPickerField } from "./reservation-dress-picker-field";
import { ReservationReceiptPreview } from "./reservation-receipt-preview";

const reservationStatusSchema = z.enum(reservationStatuses);
const paymentMethodSchema = z.enum(paymentMethods);

const createFormSchema = z.object({
  dressId: z.uuid(translationKey("systemPages.reservationInvalidDress")),
  customerId: z.string().optional(),
  customerName: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .max(255, translationKey("forms.validation.max255")),
  customerPhone: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .max(32, translationKey("forms.validation.max32")),
  receivingDateTime: z.date({
    error: translationKey("systemPages.reservationValidationReceivingRequired"),
  }),
  returnDateTime: z.date({
    error: translationKey("systemPages.reservationValidationReturnRequired"),
  }),
  occasionDate: z.date(),
  depositPaid: z
    .number()
    .int()
    .min(100, translationKey("systemPages.reservationMinDeposit"))
    .max(10_000_000, translationKey("forms.validation.numberIntMaxLarge")),
  discount: z
    .number()
    .int()
    .min(0, translationKey("forms.validation.numberIntMin0"))
    .max(10_000_000, translationKey("forms.validation.numberIntMaxLarge")),
  paymentMethod: paymentMethodSchema,
  status: reservationStatusSchema,
  notes: z
    .string()
    .trim()
    .max(4000, translationKey("forms.validation.max4000"))
    .optional(),
});

const editFormSchema = z.object({
  reservationCode: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .max(128, translationKey("forms.validation.max128")),
  dressId: z.uuid(translationKey("systemPages.reservationInvalidDress")),
  customerId: z.uuid(translationKey("forms.validation.invalidUuid")),
  customerName: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .max(255, translationKey("forms.validation.max255")),
  customerPhone: z
    .string()
    .trim()
    .max(32, translationKey("forms.validation.max32"))
    .optional(),
  receivingDateTime: z.date({
    error: translationKey("systemPages.reservationValidationReceivingRequired"),
  }),
  returnDateTime: z.date({
    error: translationKey("systemPages.reservationValidationReturnRequired"),
  }),
  occasionDate: z.date(),
  totalPrice: z
    .number()
    .int()
    .min(0, translationKey("forms.validation.numberIntMin0"))
    .max(10_000_000, translationKey("forms.validation.numberIntMaxLarge")),
  depositPaid: z
    .number()
    .int()
    .min(0, translationKey("forms.validation.numberIntMin0"))
    .max(10_000_000, translationKey("forms.validation.numberIntMaxLarge")),
  discount: z
    .number()
    .int()
    .min(0, translationKey("forms.validation.numberIntMin0"))
    .max(10_000_000, translationKey("forms.validation.numberIntMaxLarge")),
  status: reservationStatusSchema,
  notes: z
    .string()
    .trim()
    .max(4000, translationKey("forms.validation.max4000"))
    .optional(),
});

type CreateFormValues = z.infer<typeof createFormSchema>;
type EditFormValues = z.infer<typeof editFormSchema>;

const CREATE_TOTAL_STEPS = 3;

const createStep1Schema = createFormSchema.pick({
  dressId: true,
  receivingDateTime: true,
  returnDateTime: true,
  occasionDate: true,
});

const createStep2Schema = createFormSchema.pick({
  customerId: true,
  customerName: true,
  customerPhone: true,
});

const createStep3Schema = createFormSchema.pick({
  depositPaid: true,
  discount: true,
  paymentMethod: true,
  status: true,
  notes: true,
});

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
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const branchState = useBranch();
  const isEdit = reservation != null;
  const [createStep, setCreateStep] = useState(1);
  const activeBranchId =
    reservation?.branchId ??
    (branchState?.hasActiveOrg ? branchState.activeBranch.id : undefined);
  const isAllBranchesMode =
    !isEdit &&
    branchState != null &&
    branchState.canViewAllBranches &&
    !branchState.hasActiveOrg;
  const formDataInput = activeBranchId ? { branchId: activeBranchId } : {};
  const createMut = useMutation(trpc.reservations.create.mutationOptions());
  const updateMut = useMutation(trpc.reservations.update.mutationOptions());
  const generateCodeMut = useMutation(
    trpc.reservations.generateCode.mutationOptions(),
  );
  const [previewReservationCode, setPreviewReservationCode] = useState("");
  const { data: formData, isFetching: formDataLoading } = useQuery({
    ...trpc.reservations.formData.queryOptions(formDataInput),
    enabled: open,
  });

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

  const createDefaults = useMemo<CreateFormValues>(() => {
    const { occasionDate, receivingDateTime, returnDateTime } =
      buildDefaultReservationDatetimes();
    return {
      dressId: "",
      customerId: "",
      customerName: "",
      customerPhone: "",
      receivingDateTime,
      returnDateTime,
      occasionDate,
      depositPaid: 100,
      discount: 0,
      paymentMethod: "cash",
      status: "reserved",
      notes: "",
    };
  }, []);

  const editDefaults = useMemo<EditFormValues>(
    () => ({
      reservationCode: reservation?.reservationCode ?? "",
      dressId: reservation?.dressId ?? "",
      customerId: reservation?.customerId ?? "",
      customerName: reservation?.customerName ?? "",
      customerPhone: reservation?.customerPhone ?? "",
      receivingDateTime: reservation
        ? new Date(reservation.receivingDateTime)
        : new Date(),
      returnDateTime: reservation
        ? new Date(reservation.returnDateTime)
        : new Date(),
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
      const latestFormData = await queryClient.ensureQueryData(
        trpc.reservations.formData.queryOptions(formDataInput),
      );
      const dress = latestFormData.dresses.find((d) => d.id === value.dressId);
      const submitBranchId = activeBranchId ?? dress?.branchId;
      if (!submitBranchId) {
        toast.error(
          String(
            t(
              isAllBranchesMode
                ? "systemPages.reservationsFormSelectDressForBranch"
                : "systemPages.reservationBranchRequired",
            ),
          ),
        );
        return;
      }

      try {
        await toast
          .promise(
            createMut.mutateAsync({
              branchId: submitBranchId,
              dressId: value.dressId,
              customerId: value.customerId?.trim() || undefined,
              customerName: value.customerName,
              customerPhone: value.customerPhone,
              receivingDateTime: value.receivingDateTime,
              occasionDate: value.occasionDate,
              returnDateTime: value.returnDateTime,
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
      if (!activeBranchId || !reservation) return;

      try {
        await toast
          .promise(
            updateMut.mutateAsync({
              id: reservation.id,
              branchId: activeBranchId,
              dressId: value.dressId,
              customerId: value.customerId,
              reservationCode: value.reservationCode,
              customerName: value.customerName,
              customerPhone: value.customerPhone?.trim() || undefined,
              receivingDateTime: value.receivingDateTime,
              occasionDate: value.occasionDate,
              returnDateTime: value.returnDateTime,
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

  const createDressId = useStore(
    createForm.store,
    (state) => state.values.dressId,
  );
  const createCustomerId = useStore(
    createForm.store,
    (state) => state.values.customerId,
  );
  const createFormValues = useStore(createForm.store, (state) => state.values);

  const selectedDress = useMemo(
    () => formData?.dresses.find((d) => d.id === createDressId),
    [createDressId, formData?.dresses],
  );

  const resolvedBranchId = activeBranchId ?? selectedDress?.branchId;

  const previewBranchName = useMemo(() => {
    if (branchState?.hasActiveOrg) {
      return locale === "ar"
        ? branchState.activeBranch.nameAr
        : branchState.activeBranch.nameEn;
    }
    if (selectedDress) {
      return locale === "ar"
        ? selectedDress.branchNameAr
        : selectedDress.branchNameEn;
    }
    return "";
  }, [branchState, locale, selectedDress]);

  const currencyLocale = locale === "ar" ? "ar-EG" : "en-EG";

  const customerOptions = useMemo(
    () =>
      (formData?.customers ?? []).map((c) => ({
        value: c.id,
        label: `${c.name} — ${c.phone}`,
      })),
    [formData?.customers],
  );

  const dressOptions = useMemo(
    () =>
      (formData?.dresses ?? []).map((d) => ({
        value: d.id,
        label: isAllBranchesMode
          ? `${d.title} (${d.code}) — ${locale === "ar" ? d.branchNameAr : d.branchNameEn}`
          : `${d.title} (${d.code})`,
      })),
    [formData?.dresses, isAllBranchesMode, locale],
  );

  const form = isEdit ? editForm : createForm;
  const pending = createMut.isPending || updateMut.isPending;
  const SubmitIcon = pending ? Loader2Icon : isEdit ? SaveIcon : PlusIcon;
  const formId = useId();

  const tryAdvanceCreateStep = useCallback(() => {
    setCreateStep((current) => {
      const v = createForm.store.state.values as CreateFormValues;
      if (current === 1) {
        const r = createStep1Schema.safeParse({
          dressId: v.dressId,
          receivingDateTime: v.receivingDateTime,
          returnDateTime: v.returnDateTime,
          occasionDate: v.occasionDate,
        });
        if (!r.success) {
          toast.error(
            translateZodIssueMessages(
              (key) => String(t(key as never)),
              r.error.issues,
            ),
          );
          return current;
        }
        return 2;
      }
      if (current === 2) {
        const r = createStep2Schema.safeParse({
          customerId: v.customerId,
          customerName: v.customerName,
          customerPhone: v.customerPhone,
        });
        if (!r.success) {
          toast.error(
            translateZodIssueMessages(
              (key) => String(t(key as never)),
              r.error.issues,
            ),
          );
          return current;
        }
        if (!v.customerId?.trim() && formData?.customers) {
          const phone = v.customerPhone.trim();
          const existing = formData.customers.find((c) => c.phone === phone);
          if (existing) {
            createForm.setFieldValue("customerId", existing.id);
            createForm.setFieldValue("customerName", existing.name);
            createForm.setFieldValue("customerPhone", existing.phone);
          }
        }
        return 3;
      }
      return current;
    });
  }, [createForm, formData?.customers, t]);

  useEffect(() => {
    if (!open || isEdit || !resolvedBranchId || !previewBranchName) return;
    let cancelled = false;
    void generateCodeMut
      .mutateAsync({
        branchId: resolvedBranchId,
        branchName: previewBranchName,
      })
      .then((res) => {
        if (!cancelled) setPreviewReservationCode(res.reservationCode);
      })
      .catch(() => {
        if (!cancelled) setPreviewReservationCode("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, isEdit, resolvedBranchId, previewBranchName]);

  useEffect(() => {
    if (!open || isEdit) return;
    const customer = formData?.customers.find((c) => c.id === createCustomerId);
    if (!customer) return;
    createForm.setFieldValue("customerName", customer.name);
    createForm.setFieldValue("customerPhone", customer.phone);
  }, [createCustomerId, formData?.customers, open, isEdit, createForm]);

  useEffect(() => {
    if (!open || isEdit || !selectedDress) return;
    createForm.setFieldValue("depositPaid", selectedDress.depositAmount);
  }, [createDressId, open, isEdit, selectedDress, createForm]);

  useEffect(() => {
    if (!open || isEdit) return;
    const occasionDate = createFormValues.occasionDate;
    const synced = syncReceivingReturnFromOccasion(
      occasionDate,
      createFormValues.receivingDateTime,
      createFormValues.returnDateTime,
    );
    createForm.setFieldValue("receivingDateTime", synced.receivingDateTime);
    createForm.setFieldValue("returnDateTime", synced.returnDateTime);
  }, [open, isEdit, createForm, createFormValues.occasionDate]);

  const createStepTitleKey =
    createStep === 1
      ? "systemPages.reservationsFormStepDress"
      : createStep === 2
        ? "systemPages.reservationsFormStepCustomer"
        : "systemPages.reservationsFormStepPayment";

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      editForm.reset(editDefaults);
    } else {
      createForm.reset(createDefaults);
      setCreateStep(1);
    }
  }, [
    open,
    reservation?.id,
    isEdit,
    createDefaults,
    editDefaults,
    createForm,
    editForm,
  ]);

  const handleBodySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  const { data: blockedRangesRaw } = useQuery({
    ...trpc.reservations.dressOccasionBlockedRanges.queryOptions({
      dressId: createDressId,
      branchId: resolvedBranchId,
    }),
    enabled: open && !isEdit && Boolean(createDressId),
  });

  const blockedOccasionRanges = useMemo(
    () =>
      (blockedRangesRaw ?? []).map((range) => ({
        start: new Date(range.start),
        end: new Date(range.end),
      })),
    [blockedRangesRaw],
  );

  const occasionDisabledDays = useCallback(
    (date: Date) =>
      isOccasionDayBlocked(
        date,
        blockedOccasionRanges,
        createFormValues.occasionDate,
      ),
    [blockedOccasionRanges, createFormValues.occasionDate],
  );

  const receiptPreviewProps = useMemo(
    () =>
      mapToReceiptProps({
        reservationCode: previewReservationCode || undefined,
        branchName: previewBranchName,
        customerName: createFormValues.customerName,
        customerPhone: createFormValues.customerPhone,
        dress: selectedDress
          ? {
              id: selectedDress.id,
              title: selectedDress.title,
              code: selectedDress.code,
              size: selectedDress.size,
              color: selectedDress.color,
              pricePerDay: selectedDress.pricePerDay,
              insurance: selectedDress.insurance,
            }
          : null,
        receivingDateTime: createFormValues.receivingDateTime,
        occasionDate: createFormValues.occasionDate,
        returnDateTime: createFormValues.returnDateTime,
        discount: createFormValues.discount,
        depositPaid: createFormValues.depositPaid,
        paymentMethod: createFormValues.paymentMethod,
        status: createFormValues.status,
        notes: createFormValues.notes,
      }),
    [
      createFormValues,
      previewBranchName,
      previewReservationCode,
      selectedDress,
    ],
  );

  const customerFieldsLocked = Boolean(createCustomerId?.trim());

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
            <ReservationDressPickerField
              label={String(t("systemPages.reservationsDress"))}
              options={dressOptions}
              placeholder={String(t("systemPages.reservationsSearchDress"))}
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
            <field.MobileField
              label={String(t("systemPages.reservationsCustomerPhone"))}
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
        <editForm.AppField name="receivingDateTime">
          {(field) => (
            <field.DateTimeField
              label={String(t("systemPages.reservationsReceiving"))}
            />
          )}
        </editForm.AppField>
        <editForm.AppField name="returnDateTime">
          {(field) => (
            <field.DateTimeField
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
            <field.TextareaField
              label={String(t("systemPages.reservationsNotes"))}
              placeholder={String(t("systemPages.reservationsNotes"))}
            />
          )}
        </editForm.AppField>
      </FieldGroup>
    </FieldSet>
  ) : (
    <FieldSet disabled={pending}>
      <FieldGroup>
        <div hidden={createStep !== 1} className="space-y-4">
          {isAllBranchesMode ? (
            <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-muted-foreground text-sm">
              {String(t("systemPages.reservationsFormAllBranchesHint"))}
            </div>
          ) : null}
          {!formDataLoading && dressOptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {String(
                t(
                  isAllBranchesMode
                    ? "systemPages.reservationsFormNoDresses"
                    : "systemPages.reservationsFormNoDressesInBranch",
                ),
              )}
            </p>
          ) : null}
          <createForm.AppField name="dressId">
            {(field) => (
              <ReservationDressPickerField
                label={String(t("systemPages.reservationsDress"))}
                options={dressOptions}
                placeholder={String(t("systemPages.reservationsSearchDress"))}
              />
            )}
          </createForm.AppField>
          <createForm.AppField name="occasionDate">
            {(field) => (
              <field.DateField
                disabled={!createDressId}
                disabledDays={occasionDisabledDays}
                label={String(t("systemPages.reservationsOccasion"))}
              />
            )}
          </createForm.AppField>
          <createForm.AppField name="receivingDateTime">
            {(field) => (
              <field.DateTimeField
                disabled={!createDressId}
                label={String(t("systemPages.reservationsReceiving"))}
              />
            )}
          </createForm.AppField>
          <createForm.AppField name="returnDateTime">
            {(field) => (
              <field.DateTimeField
                disabled={!createDressId}
                label={String(t("systemPages.reservationsReturn"))}
              />
            )}
          </createForm.AppField>
        </div>

        <div hidden={createStep !== 2} className="space-y-4">
          <createForm.AppField name="customerId">
            {(field) => (
              <field.ComboboxOneField
                label={String(t("systemPages.reservationsCustomer"))}
                options={customerOptions}
                placeholder={String(
                  t("systemPages.reservationsSelectCustomer"),
                )}
              />
            )}
          </createForm.AppField>
          <div className="grid gap-4 sm:grid-cols-2">
            <createForm.AppField name="customerName">
              {(field) => (
                <field.StringField
                  disabled={customerFieldsLocked}
                  label={String(t("systemPages.reservationsCustomerName"))}
                />
              )}
            </createForm.AppField>
            <createForm.AppField name="customerPhone">
              {(field) => (
                <field.MobileField
                  disabled={customerFieldsLocked}
                  label={String(t("systemPages.reservationsCustomerPhone"))}
                />
              )}
            </createForm.AppField>
          </div>
        </div>

        <div hidden={createStep !== 3} className="space-y-4">
          <div className="grid items-start gap-4 md:grid-cols-2">
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
          </div>
          {selectedDress ? (
            <p className="text-muted-foreground text-xs">
              {String(
                t("systemPages.reservationsDepositAmountHint", {
                  amount: formatCurrency(
                    selectedDress.depositAmount,
                    currencyLocale,
                  ),
                }),
              )}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
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
          </div>
          <createForm.AppField name="notes">
            {(field) => (
              <field.TextareaField
                label={String(t("systemPages.reservationsNotes"))}
                placeholder={String(t("systemPages.reservationsNotes"))}
                rows={4}
              />
            )}
          </createForm.AppField>
        </div>
      </FieldGroup>
    </FieldSet>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          isEdit
            ? "gap-0 overflow-hidden p-0 sm:max-w-lg"
            : "gap-0 overflow-hidden p-0 sm:max-w-4xl"
        }
      >
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
          {!isEdit ? (
            <div className="space-y-1">
              <p className="text-muted-foreground text-sm">
                {String(
                  t("systemPages.reservationsFormStepProgress", {
                    current: String(createStep),
                    total: String(CREATE_TOTAL_STEPS),
                  }),
                )}
              </p>
              <p className="font-medium text-foreground text-sm">
                {String(t(createStepTitleKey))}
              </p>
            </div>
          ) : null}
        </DialogHeader>
        <ScrollArea className="min-h-0 max-h-[min(70vh,640px)] flex-1 px-4 py-4">
          <div className="space-y-4">
            {!isEdit && resolvedBranchId ? (
              <ReservationReceiptPreview preview={receiptPreviewProps} />
            ) : null}
            <OverlayFormBody
              formId={formId}
              className="space-y-4"
              onSubmit={handleBodySubmit}
            >
              {formBody}
            </OverlayFormBody>
          </div>
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
            {isEdit ? (
              <OverlayFormSubmitButton
                formId={formId}
                size="default"
                disabled={pending || !resolvedBranchId}
              >
                <SubmitIcon
                  className={pending ? "size-3.5 animate-spin" : "size-3.5"}
                />
                {pending
                  ? String(t("common.saving"))
                  : String(t("common.save"))}
              </OverlayFormSubmitButton>
            ) : (
              <>
                {createStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    disabled={pending}
                    onClick={() =>
                      setCreateStep((s) => Math.max(1, s - 1))
                    }
                  >
                    {String(t("common.back"))}
                  </Button>
                ) : null}
                {createStep < CREATE_TOTAL_STEPS ? (
                  <Button
                    type="button"
                    size="default"
                    disabled={pending || !resolvedBranchId}
                    onClick={() => tryAdvanceCreateStep()}
                  >
                    {String(t("common.next"))}
                  </Button>
                ) : (
                  <OverlayFormSubmitButton
                    formId={formId}
                    size="default"
                    disabled={pending || !resolvedBranchId}
                  >
                    <SubmitIcon
                      className={
                        pending ? "size-3.5 animate-spin" : "size-3.5"
                      }
                    />
                    {pending
                      ? String(t("common.saving"))
                      : String(t("common.create"))}
                  </OverlayFormSubmitButton>
                )}
              </>
            )}
          </OverlayFormFooterActions>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
