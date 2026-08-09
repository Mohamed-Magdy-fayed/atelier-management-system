"use client";

import { useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import type { FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { expenseTypes } from "@/drizzle/schemas/system/expenses-table";
import { useTranslation } from "@/features/core/i18n/client";
import { translationKey } from "@/features/core/i18n/global";
import { useInvalidateDashboard } from "@/features/system/dashboard/lib/use-invalidate-dashboard";
import { DressPickerField } from "@/features/system/dresses/admin/components/dress-picker-field";
import { useBranchFieldOptions } from "@/features/system/shared/use-branch-field-options";
import { useTRPC } from "@/integrations/trpc/client";
import type { ExpenseGridRow } from "@/integrations/trpc/routers/expenses";

const expenseFormSchema = z.object({
  branchId: z.uuid(translationKey("forms.validation.required")),
  type: z.enum(expenseTypes),
  amount: z
    .string()
    .trim()
    .min(1, translationKey("forms.validation.required"))
    .superRefine((raw, ctx) => {
      const n = Number(raw);
      if (!Number.isInteger(n) || n <= 0 || n > 10_000_000) {
        ctx.addIssue({
          code: "custom",
          message: translationKey("forms.validation.invalidAmount"),
        });
      }
    }),
  dressId: z.string().optional(),
  employeeId: z.string().optional(),
  description: z
    .string()
    .trim()
    .max(500, translationKey("forms.validation.max255")),
  note: z
    .string()
    .trim()
    .max(1000, translationKey("forms.validation.max4000"))
    .optional(),
  date: z.string().date(translationKey("forms.validation.required")),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

type ExpenseFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: ExpenseGridRow | null;
  prefill?: Partial<ExpenseFormValues>;
};

const DRESS_TYPES = ["drycleaning", "tailoring", "dressAcquisition"] as const;
type DressType = (typeof DRESS_TYPES)[number];

function isDressType(type: string): type is DressType {
  return (DRESS_TYPES as readonly string[]).includes(type);
}

function statusForExpenseType(type: string): string | null {
  if (type === "drycleaning") return "atDryCleaner";
  if (type === "tailoring") return "atTailor";
  return null;
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  prefill,
}: ExpenseFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidateDashboard = useInvalidateDashboard();
  const { options: branchOptions, defaultBranchId } = useBranchFieldOptions();

  const isEdit = !!expense;

  const createMut = useMutation(trpc.expenses.create.mutationOptions());
  const updateMut = useMutation(trpc.expenses.update.mutationOptions());
  const updateDressStatusMut = useMutation(
    trpc.dresses.updateStatus.mutationOptions(),
  );

  const [pendingDressStatus, setPendingDressStatus] = useState<{
    dressId: string;
    status: string;
    statusLabel: string;
  } | null>(null);

  const defaultValues = useMemo<ExpenseFormValues>(() => {
    if (expense) {
      return {
        branchId: expense.branchId,
        type: expense.type as ExpenseFormValues["type"],
        amount: String(expense.amount),
        dressId: expense.dressId ?? undefined,
        employeeId: expense.employeeId ?? undefined,
        description: expense.description,
        note: expense.note ?? undefined,
        date: expense.date,
      };
    }
    return {
      branchId: prefill?.branchId ?? defaultBranchId,
      type: prefill?.type ?? "custom",
      amount: prefill?.amount ?? "",
      dressId: prefill?.dressId ?? undefined,
      employeeId: prefill?.employeeId ?? undefined,
      description: prefill?.description ?? "",
      note: prefill?.note ?? undefined,
      date: prefill?.date ?? new Date().toISOString().slice(0, 10),
    };
  }, [expense, prefill, defaultBranchId]);

  // What the form is currently editing: a specific expense, or a new draft.
  const formIdentity = expense?.id ?? "new";
  const resetForRef = useRef<string | null>(null);

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: expenseFormSchema },
    onSubmit: async ({ value }) => {
      const payload = {
        branchId: value.branchId,
        type: value.type,
        amount: Number(value.amount),
        dressId:
          isDressType(value.type) && value.dressId ? value.dressId : undefined,
        employeeId:
          value.type === "salary" && value.employeeId
            ? value.employeeId
            : undefined,
        description: value.description.trim(),
        note: value.note?.trim() || undefined,
        date: value.date,
      };

      try {
        await toast
          .promise(
            isEdit
              ? updateMut.mutateAsync({ id: expense.id, ...payload })
              : createMut.mutateAsync(payload),
            {
              loading: String(t("common.saving")),
              success: String(
                t(
                  isEdit
                    ? "systemPages.expenseUpdated"
                    : "systemPages.expenseCreated",
                ),
              ),
              error: (err) =>
                err instanceof Error
                  ? err.message
                  : String(t("systemPages.expenseSaveFailed")),
            },
          )
          .unwrap();

        await queryClient.invalidateQueries({
          queryKey: trpc.expenses.pathKey(),
        });
        await invalidateDashboard();

        // Saved — the draft is spent, so the next open starts from defaults.
        resetForRef.current = null;

        const newStatus = statusForExpenseType(value.type);
        if (!isEdit && newStatus && payload.dressId) {
          const statusLabel = String(
            t(
              newStatus === "atDryCleaner"
                ? "systemPages.dressCurrentStatusAtDryCleaner"
                : "systemPages.dressCurrentStatusAtTailor",
            ),
          );
          setPendingDressStatus({
            dressId: payload.dressId,
            status: newStatus,
            statusLabel,
          });
        } else {
          onOpenChange(false);
        }
      } catch {
        // toast.promise surfaced the error
      }
    },
  });

  const selectedType = useStore(form.store, (s) => s.values.type);
  const selectedBranchId = useStore(form.store, (s) => s.values.branchId);

  // Dress and employee options are branch-scoped, so they follow the branch
  // picked in the form — not the active branch in the sidebar.
  const { data: formData } = useQuery(
    trpc.expenses.formData.queryOptions({
      branchId: selectedBranchId || undefined,
    }),
  );

  useEffect(() => {
    if (!open) return;
    // Reopening the same target keeps whatever was already typed, so stepping
    // out of the dialog (to switch branch, look something up) is not
    // destructive. A successful save clears the ref to start the next one fresh.
    if (resetForRef.current === formIdentity) return;
    resetForRef.current = formIdentity;
    form.reset(defaultValues);
  }, [open, formIdentity, defaultValues, form.reset]);

  const pending = createMut.isPending || updateMut.isPending;
  const formId = useId();

  const handleBodySubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  const typeOptions = expenseTypes.map((v) => ({
    value: v,
    label: String(
      t(
        v === "drycleaning"
          ? "systemPages.expenseTypeDrycleaning"
          : v === "tailoring"
            ? "systemPages.expenseTypeTailoring"
            : v === "dressAcquisition"
              ? "systemPages.expenseTypeDressAcquisition"
              : v === "salary"
                ? "systemPages.expenseTypeSalary"
                : "systemPages.expenseTypeCustom",
      ),
    ),
  }));

  const dressOptions = useMemo(
    () =>
      (formData?.dresses ?? []).map((d) => ({
        value: d.id,
        label: `${d.title} (${d.code})`,
      })),
    [formData?.dresses],
  );

  const employeeOptions = useMemo(
    () =>
      (formData?.employees ?? []).map((e) => ({
        value: e.id,
        label: e.name ?? e.email,
      })),
    [formData?.employees],
  );

  const showDressField = isDressType(selectedType);
  const showEmployeeField = selectedType === "salary";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 px-4 pt-4">
            <DialogTitle>
              {String(
                t(
                  isEdit
                    ? "systemPages.editExpense"
                    : "systemPages.addExpense",
                ),
              )}
            </DialogTitle>
            <DialogDescription>
              {String(
                t(
                  isEdit
                    ? "systemPages.editExpenseDescription"
                    : "systemPages.addExpenseDescription",
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
                  <form.AppField
                    name="branchId"
                    listeners={{
                      onChange: () => {
                        // Dress and employee options are branch-scoped; a pick
                        // left over from the previous branch would be rejected.
                        form.setFieldValue("dressId", undefined);
                        form.setFieldValue("employeeId", undefined);
                      },
                    }}
                  >
                    {(field) => (
                      <field.SelectField
                        label={String(t("systemPages.formBranch"))}
                        placeholder={String(
                          t("systemPages.formBranchPlaceholder"),
                        )}
                        options={branchOptions}
                        disabled={isEdit}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="type">
                    {(field) => (
                      <field.SelectField
                        label={String(t("systemPages.expensesType"))}
                        options={typeOptions}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="date">
                    {(field) => (
                      <field.DateField
                        label={String(t("systemPages.expensesDate"))}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="amount">
                    {(field) => (
                      <field.StringField
                        label={String(t("systemPages.expensesAmount"))}
                        placeholder="0"
                      />
                    )}
                  </form.AppField>
                  {showDressField ? (
                    <form.AppField name="dressId">
                      {() => (
                        <DressPickerField
                          clearable
                          label={String(t("systemPages.expensesDress"))}
                          options={dressOptions}
                        />
                      )}
                    </form.AppField>
                  ) : null}
                  {showEmployeeField ? (
                    <form.AppField name="employeeId">
                      {(field) => (
                        <field.SelectField
                          label={String(t("systemPages.expensesEmployee"))}
                          options={[
                            { value: "", label: "—" },
                            ...employeeOptions,
                          ]}
                        />
                      )}
                    </form.AppField>
                  ) : null}
                  <form.AppField name="description">
                    {(field) => (
                      <field.StringField
                        label={String(t("systemPages.expensesDescription"))}
                        placeholder={String(t("forms.descriptionPlaceholder"))}
                      />
                    )}
                  </form.AppField>
                  <form.AppField name="note">
                    {(field) => (
                      <field.TextareaField
                        label={String(t("systemPages.expensesNote"))}
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
                {pending
                  ? String(t("common.saving"))
                  : String(t("common.save"))}
              </OverlayFormSubmitButton>
            </OverlayFormFooterActions>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDressStatus}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDressStatus(null);
            onOpenChange(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {String(t("systemPages.expenseUpdateDressStatusPrompt"))}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {String(
                t("systemPages.expenseUpdateDressStatusDescription", {
                  status: pendingDressStatus?.statusLabel ?? "",
                }),
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingDressStatus(null);
                onOpenChange(false);
              }}
            >
              {String(t("common.cancel"))}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingDressStatus) return;
                try {
                  await updateDressStatusMut.mutateAsync({
                    id: pendingDressStatus.dressId,
                    currentStatus: pendingDressStatus.status as
                      | "atTailor"
                      | "atDryCleaner",
                  });
                  await queryClient.invalidateQueries({
                    queryKey: trpc.dresses.pathKey(),
                  });
                  await invalidateDashboard();
                } catch {
                  toast.error(String(t("systemPages.dressStatusChangeFailed")));
                } finally {
                  setPendingDressStatus(null);
                  onOpenChange(false);
                }
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
