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
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

const userFormSchema = z.object({
  name: z.string().trim().min(1).max(256),
  email: z.string().trim().email().max(256),
  phone: z.string().trim().max(16),
  age: z.number().int().min(0).max(150).nullable(),
  role: z.enum(["admin", "employee", "customer"]),
  branchIds: z.array(z.string().uuid()),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserGridRow | null;
  defaultRole?: UserFormValues["role"];
  /** Prefills branch assignment when creating from a branch-scoped screen. */
  branchId?: string;
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  defaultRole = "customer",
  branchId,
}: UserFormDialogProps) {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEdit = user != null;
  const resolvedRole = (user?.role as UserFormValues["role"]) ?? defaultRole;
  const assignsBranches =
    resolvedRole === "employee" || resolvedRole === "admin";

  const createMut = useMutation(trpc.users.create.mutationOptions());
  const updateMut = useMutation(trpc.users.update.mutationOptions());

  const branchesQuery = useQuery({
    ...trpc.users.listAssignableBranches.queryOptions(),
    enabled: open && assignsBranches,
  });

  const userBranchIdsQuery = useQuery({
    ...trpc.users.getBranchIds.queryOptions({ id: user?.id ?? "" }),
    enabled: open && isEdit && assignsBranches && Boolean(user?.id),
  });

  const branchOptions = useMemo(
    () =>
      (branchesQuery.data ?? []).map((branch) => ({
        value: branch.id,
        label: locale === "ar" ? branch.nameAr : branch.nameEn,
      })),
    [branchesQuery.data, locale],
  );

  const initialBranchIds = useMemo(() => {
    if (isEdit && userBranchIdsQuery.data) {
      return userBranchIdsQuery.data;
    }
    if (branchId) {
      return [branchId];
    }
    return [];
  }, [branchId, isEdit, userBranchIdsQuery.data]);

  const defaultValues = useMemo<UserFormValues>(
    () => ({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      age: user?.age ?? null,
      role: resolvedRole,
      branchIds: initialBranchIds,
    }),
    [initialBranchIds, resolvedRole, user],
  );

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: userFormSchema },
    onSubmit: async ({ value }) => {
      if (assignsBranches && value.branchIds.length === 0) {
        toast.error(String(t("systemPages.userBranchesRequired")));
        return;
      }

      const payload = {
        name: value.name,
        email: value.email,
        phone: value.phone ? value.phone : null,
        age: value.age,
        role: resolvedRole,
        ...(assignsBranches ? { branchIds: value.branchIds } : {}),
      };
      const action =
        isEdit && user
          ? updateMut.mutateAsync({ id: user.id, ...payload })
          : createMut.mutateAsync(payload);

      try {
        await toast
          .promise(action, {
            loading: String(
              t(isEdit ? "common.saving" : "systemPages.userCreating"),
            ),
            success: String(
              t(isEdit ? "systemPages.userUpdated" : "systemPages.userCreated"),
            ),
            error: (err) =>
              err instanceof Error
                ? err.message
                : String(t("systemPages.userSaveFailed")),
          })
          .unwrap();
        await queryClient.invalidateQueries({
          queryKey: trpc.users.pathKey(),
        });
        onOpenChange(false);
      } catch {
        // toast.promise already surfaced the error to the user.
      }
    },
  });

  useEffect(() => {
    if (!open) return;
    if (isEdit && userBranchIdsQuery.isPending) return;
    form.reset(defaultValues);
  }, [defaultValues, form, isEdit, open, userBranchIdsQuery.isPending]);

  const pending = createMut.isPending || updateMut.isPending;
  const entityLabel = t(
    resolvedRole === "employee"
      ? "systemPages.roleEmployee"
      : resolvedRole === "admin"
        ? "systemPages.roleAdmin"
        : "systemPages.roleCustomer",
  );
  const dialogTitle = `${t(isEdit ? "common.edit" : "common.add")} ${entityLabel}`;
  const dialogDescription = isEdit
    ? `${t("common.edit")} ${entityLabel.toLowerCase()}.`
    : `${t("common.create")} ${entityLabel.toLowerCase()}.`;

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
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
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
                  {(f) => (
                    <f.StringField
                      label={String(t("forms.name"))}
                      placeholder={String(t("forms.namePlaceholder"))}
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="email">
                  {(f) => (
                    <f.EmailField label={String(t("dataTable.columnEmail"))} />
                  )}
                </form.AppField>
                <form.AppField name="phone">
                  {(f) => (
                    <f.MobileField label={String(t("dataTable.phone"))} />
                  )}
                </form.AppField>
                <form.AppField name="age">
                  {(f) => <f.NumberField label={String(t("forms.age"))} />}
                </form.AppField>
                {assignsBranches ? (
                  <form.AppField name="branchIds">
                    {(f) => (
                      <f.SelectField
                        multiple
                        label={String(t("systemPages.userAssignedBranches"))}
                        placeholder={String(
                          t("systemPages.userAssignedBranchesPlaceholder"),
                        )}
                        options={branchOptions}
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
              <XIcon className="text-destructive" />
              {t("common.cancel")}
            </Button>
            <OverlayFormSubmitButton
              formId={formId}
              size="default"
              disabled={pending || (assignsBranches && branchesQuery.isPending)}
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
