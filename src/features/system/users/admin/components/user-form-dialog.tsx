"use client";

import { useStore } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CopyIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
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
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { passwordSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

import { generatePassword } from "./generate-password";

const userFormSchema = z.object({
  name: z.string().trim().min(1).max(256),
  email: z.string().trim().email().max(256),
  phone: z.string().trim().max(16),
  age: z.number().int().min(0).max(150).nullable(),
  role: z.enum(["admin", "employee", "customer"]),
  branchIds: z.array(z.string().uuid()),
  /** Empty means "don't touch credentials"; anything else must be strong. */
  password: z.literal("").or(passwordSchema),
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
  const { session } = useAuth();
  const isEdit = user != null;
  const resolvedRole = (user?.role as UserFormValues["role"]) ?? defaultRole;
  const assignsBranches =
    resolvedRole === "employee" || resolvedRole === "admin";

  // Creating admins and setting another user's password are admin-only on the
  // server (`assertAdminRole`); hide the controls rather than let them 403.
  const isAdminSession = session?.user.role === "admin";
  const canPickStaffRole = assignsBranches && isAdminSession;
  const canSetPassword = isAdminSession;

  /** Credentials to hand over after a create; also keeps the dialog open. */
  const [handover, setHandover] = useState<{
    email: string;
    password: string;
  } | null>(null);

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
      password: "",
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

      // Staff screens let an admin switch between employee and admin; the
      // customer screen has no selector, so fall back to the opened role.
      const submittedRole = canPickStaffRole ? value.role : resolvedRole;
      const password = canSetPassword ? value.password.trim() : "";

      const payload = {
        name: value.name,
        email: value.email,
        phone: value.phone ? value.phone : null,
        age: value.age,
        role: submittedRole,
        ...(assignsBranches ? { branchIds: value.branchIds } : {}),
        ...(password ? { password } : {}),
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

        // A fresh account with a password is the only case worth pausing on —
        // this is the one chance to copy the credentials before they're gone.
        if (!isEdit && password) {
          setHandover({ email: value.email, password });
          return;
        }
        onOpenChange(false);
      } catch {
        // toast.promise already surfaced the error to the user.
      }
    },
  });

  const selectedRole = useStore(form.store, (s) => s.values.role);

  useEffect(() => {
    if (!open) return;
    if (handover) return;
    if (isEdit && userBranchIdsQuery.isPending) return;
    form.reset(defaultValues);
  }, [
    defaultValues,
    form,
    handover,
    isEdit,
    open,
    userBranchIdsQuery.isPending,
  ]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setHandover(null);
      onOpenChange(next);
    },
    [onOpenChange],
  );

  const pending = createMut.isPending || updateMut.isPending;
  const displayRole = canPickStaffRole ? selectedRole : resolvedRole;
  const roleLabel = (role: UserFormValues["role"]) =>
    t(
      role === "employee"
        ? "systemPages.roleEmployee"
        : role === "admin"
          ? "systemPages.roleAdmin"
          : "systemPages.roleCustomer",
    );
  const entityLabel = roleLabel(displayRole);
  const dialogTitle = handover
    ? String(t("systemPages.userCredentialsReady"))
    : `${t(isEdit ? "common.edit" : "common.add")} ${entityLabel}`;
  const dialogDescription = handover
    ? String(t("systemPages.userCredentialsReadyDescription"))
    : isEdit
      ? `${t("common.edit")} ${entityLabel.toLowerCase()}.`
      : `${t("common.create")} ${entityLabel.toLowerCase()}.`;

  const roleOptions = useMemo(
    () => [
      { value: "employee", label: String(t("systemPages.roleEmployee")) },
      { value: "admin", label: String(t("systemPages.roleAdmin")) },
    ],
    [t],
  );

  const SubmitIcon = pending ? Loader2Icon : isEdit ? SaveIcon : PlusIcon;
  const formId = useId();

  const handleBodySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  const handleCopyCredentials = useCallback(async () => {
    if (!handover) return;
    try {
      await navigator.clipboard.writeText(
        `${handover.email}\n${handover.password}`,
      );
      toast.success(String(t("systemPages.userCredentialsCopied")));
    } catch {
      toast.error(String(t("systemPages.userCredentialsCopyFailed")));
    }
  }, [handover, t]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-4 pt-4">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {handover ? (
          <>
            <div className="px-4 py-4">
              <dl className="space-y-2 rounded-md border bg-muted p-3 font-mono text-sm">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    {t("dataTable.columnEmail")}
                  </dt>
                  <dd className="break-all">{handover.email}</dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs text-muted-foreground">
                    {t("systemPages.userPassword")}
                  </dt>
                  <dd className="break-all">{handover.password}</dd>
                </div>
              </dl>
            </div>
            <DialogFooter className="shrink-0 border-t bg-muted px-4 py-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={handleCopyCredentials}
              >
                <CopyIcon className="size-3.5" />
                {t("systemPages.userCredentialsCopy")}
              </Button>
              <Button
                type="button"
                size="default"
                onClick={() => handleOpenChange(false)}
              >
                {t("common.close")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
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
                        <f.EmailField
                          label={String(t("dataTable.columnEmail"))}
                        />
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
                    {canPickStaffRole ? (
                      <form.AppField name="role">
                        {(f) => (
                          <f.SelectField
                            label={String(t("systemPages.userRole"))}
                            options={roleOptions}
                          />
                        )}
                      </form.AppField>
                    ) : null}
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
                    {canSetPassword ? (
                      <div className="space-y-2">
                        <form.AppField name="password">
                          {(f) => (
                            <f.PasswordField
                              label={String(t("systemPages.userPassword"))}
                              description={String(
                                t(
                                  isEdit
                                    ? "systemPages.userPasswordEditHint"
                                    : "systemPages.userPasswordCreateHint",
                                ),
                              )}
                            />
                          )}
                        </form.AppField>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            form.setFieldValue("password", generatePassword())
                          }
                        >
                          <RefreshCwIcon className="size-3.5" />
                          {t("systemPages.userPasswordGenerate")}
                        </Button>
                      </div>
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
                  onClick={() => handleOpenChange(false)}
                  disabled={pending}
                >
                  <XIcon className="text-destructive" />
                  {t("common.cancel")}
                </Button>
                <OverlayFormSubmitButton
                  formId={formId}
                  size="default"
                  disabled={
                    pending || (assignsBranches && branchesQuery.isPending)
                  }
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
