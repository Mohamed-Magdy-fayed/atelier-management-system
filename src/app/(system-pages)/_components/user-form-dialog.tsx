"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

const userFormSchema = z.object({
  name: z.string().trim().min(1).max(256),
  email: z.string().trim().email().max(256),
  phone: z.string().trim().max(16),
  age: z.number().int().min(0).max(150).nullable(),
  role: z.enum(["admin", "employee", "customer"]),
});

type UserFormValues = z.infer<typeof userFormSchema>;

export type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog acts in edit mode. */
  user?: UserGridRow | null;
  /** Default role for new records (e.g. "customer" on /customers, "employee" on /employees). */
  defaultRole?: UserFormValues["role"];
};

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  defaultRole = "customer",
}: UserFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEdit = user != null;

  const createMut = useMutation(trpc.users.create.mutationOptions());
  const updateMut = useMutation(trpc.users.update.mutationOptions());

  const defaultValues = useMemo<UserFormValues>(
    () => ({
      name: user?.name ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      age: user?.age ?? null,
      role: (user?.role as UserFormValues["role"]) ?? defaultRole,
    }),
    [user, defaultRole],
  );

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: userFormSchema },
    onSubmit: async ({ value }) => {
      const payload = {
        ...value,
        phone: value.phone ? value.phone : null,
      };
      const action = isEdit && user
        ? updateMut.mutateAsync({ id: user.id, ...payload })
        : createMut.mutateAsync(payload);

      try {
        await toast.promise(action, {
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
        }).unwrap();
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
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const pending = createMut.isPending || updateMut.isPending;

  const roleOptions = useMemo(
    () => [
      { value: "admin", label: String(t("systemPages.roleAdmin")) },
      { value: "employee", label: String(t("systemPages.roleEmployee")) },
      { value: "customer", label: String(t("systemPages.roleCustomer")) },
    ],
    [t],
  );

  const SubmitIcon = pending ? Loader2Icon : isEdit ? SaveIcon : PlusIcon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {String(
              t(isEdit ? "systemPages.editUser" : "systemPages.addUser"),
            )}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit
                  ? "systemPages.editUserDescription"
                  : "systemPages.addUserDescription",
              ),
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <FieldSet disabled={pending}>
            <FieldGroup>
              <form.AppField name="name">
                {(f) => (
                  <f.StringField
                    label={String(t("forms.name"))}
                    placeholder={String(t("forms.nameSearchPlaceholder"))}
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
              <div className="grid grid-cols-2 gap-3">
                <form.AppField name="age">
                  {(f) => <f.NumberField label={String(t("forms.age"))} />}
                </form.AppField>
                <form.AppField name="role">
                  {(f) => (
                    <f.SelectField
                      label={String(t("dataTable.role"))}
                      options={roleOptions}
                    />
                  )}
                </form.AppField>
              </div>
            </FieldGroup>
          </FieldSet>
          <div className="flex justify-end gap-2">
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
            <Button type="submit" size="default" disabled={pending}>
              <SubmitIcon
                className={pending ? "size-3.5 animate-spin" : "size-3.5"}
              />
              {pending
                ? String(t("common.saving"))
                : isEdit
                  ? String(t("common.save"))
                  : String(t("common.create"))}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
