"use client";

import type { FormEventHandler } from "react";
import { useCallback, useEffect, useId, useMemo, useTransition } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { useAppForm } from "@/components/forms/hooks";
import {
  OverlayFormBody,
  OverlayFormSubmitButton,
} from "@/components/forms/overlay-form";
import { SystemDialog } from "@/components/general/system-dialog";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { H4, Lead } from "@/components/ui/typography";
import {
  createBranchAction,
  updateBranchAction,
} from "@/features/core/auth/nextjs/actions";
import type { EditableBranch } from "@/features/core/auth/nextjs/components/branch-manager/types";
import { createBranchSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

type FormValues = z.infer<typeof createBranchSchema>;

export function BranchCreateFormDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const [isPending, startTransition] = useTransition();

  const defaultValues: FormValues = useMemo(
    () => ({
      nameEn: "",
      nameAr: "",
    }),
    [],
  );

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: createBranchSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await createBranchAction(value);

        if (result.isError) {
          toast.error(result.message ?? t("error", { error: "" }));
          return;
        }

        form.reset();
        toast.success(
          t("authTranslations.branch.actions.createBranch.success"),
        );
        onOpenChange(false);
      });
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();
      form.handleSubmit();
    },
    [form],
  );

  return (
    <form.AppForm>
      <SystemDialog
        isOpen={open}
        onOpenChange={onOpenChange}
        titleRender={() => <H4>{t("authTranslations.branch.create.title")}</H4>}
        actions={
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <OverlayFormSubmitButton
                className="w-full"
                disabled={isPending || isSubmitting}
                formId={formId}
              >
                {isPending || isSubmitting
                  ? t("authTranslations.branch.create.submitting")
                  : t("authTranslations.branch.create.submit")}
              </OverlayFormSubmitButton>
            )}
          </form.Subscribe>
        }
      >
        <OverlayFormBody
          className={cn("space-y-6")}
          formId={formId}
          onSubmit={handleSubmit}
        >
          <FieldSet disabled={isPending}>
            <FieldGroup>
              <form.AppField name="nameEn">
                {(field) => (
                  <field.StringField
                    label={`${t("authTranslations.branch.create.nameLabel")} (EN)`}
                    placeholder={t(
                      "authTranslations.branch.create.namePlaceholder",
                    )}
                  />
                )}
              </form.AppField>

              <form.AppField name="nameAr">
                {(field) => (
                  <field.StringField
                    label={`${t("authTranslations.branch.create.nameLabel")} (AR)`}
                    placeholder={t(
                      "authTranslations.branch.create.namePlaceholder",
                    )}
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </FieldSet>
        </OverlayFormBody>
      </SystemDialog>
    </form.AppForm>
  );
}

export function BranchEditFormDialog({
  branch,
  onOpenChange,
  open,
}: {
  branch: EditableBranch | undefined;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { t } = useTranslation();
  const formId = useId();
  const [isPending, startTransition] = useTransition();

  const defaultValues: FormValues = useMemo(
    () => ({
      nameEn: branch?.nameEn ?? "",
      nameAr: branch?.nameAr ?? "",
    }),
    [branch],
  );

  const form = useAppForm({
    defaultValues,
    validators: {
      onSubmit: createBranchSchema,
    },
    onSubmit: async ({ value }) => {
      if (!branch) return;
      startTransition(async () => {
        const result = await updateBranchAction({
          ...value,
          branchId: branch.id,
        });

        if (result.isError) {
          toast.error(result.message ?? t("error", { error: "" }));
          return;
        }

        toast.success(
          t("authTranslations.branch.actions.updateBranch.success"),
        );
        onOpenChange(false);
      });
    },
  });

  useEffect(() => {
    if (open && branch) {
      form.reset({
        nameEn: branch.nameEn,
        nameAr: branch.nameAr,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, branch?.id]);

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault();
      form.handleSubmit();
    },
    [form],
  );

  return (
    <form.AppForm>
      <SystemDialog
        isOpen={open}
        onOpenChange={onOpenChange}
        actions={
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <OverlayFormSubmitButton
                className="w-full"
                disabled={isPending || isSubmitting || branch === undefined}
                formId={formId}
              >
                {isPending || isSubmitting
                  ? t("authTranslations.branch.edit.submitting")
                  : t("authTranslations.branch.edit.submit")}
              </OverlayFormSubmitButton>
            )}
          </form.Subscribe>
        }
      >
        <div className="space-y-4">
          <Lead>{t("authTranslations.branch.edit.title")}</Lead>
          {branch ? (
            <OverlayFormBody
              className={cn("space-y-6")}
              formId={formId}
              onSubmit={handleSubmit}
            >
              <FieldSet disabled={isPending}>
                <FieldGroup>
                  <form.AppField name="nameEn">
                    {(field) => (
                      <field.StringField
                        label={`${t("authTranslations.branch.create.nameLabel")} (EN)`}
                        placeholder={t(
                          "authTranslations.branch.create.namePlaceholder",
                        )}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="nameAr">
                    {(field) => (
                      <field.StringField
                        label={`${t("authTranslations.branch.create.nameLabel")} (AR)`}
                        placeholder={t(
                          "authTranslations.branch.create.namePlaceholder",
                        )}
                      />
                    )}
                  </form.AppField>
                </FieldGroup>
              </FieldSet>
            </OverlayFormBody>
          ) : null}
        </div>
      </SystemDialog>
    </form.AppForm>
  );
}
