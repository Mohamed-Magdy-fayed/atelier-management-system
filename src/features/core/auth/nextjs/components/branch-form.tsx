"use client";

import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import {
    createBranchAction,
    updateBranchAction,
} from "@/features/core/auth/nextjs/actions";
import { createBranchSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

type FormValues = z.infer<typeof createBranchSchema>;
type BranchFormProps = {
    onSuccess?: () => void;
    branch?: { id: string; nameEn: string; nameAr: string };
};

export function BranchForm({
    onSuccess,
    branch,
}: BranchFormProps) {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();

    const isEdit = branch != null;

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
            startTransition(async () => {
                const result = isEdit
                    ? await updateBranchAction({
                        ...value,
                        branchId: branch.id,
                    })
                    : await createBranchAction(value);

                if (result.isError) {
                    toast.error(result.message ?? t("error", { error: "" }));
                    return;
                }

                if (!isEdit) {
                    form.reset();
                }

                toast.success(
                    t(
                        isEdit
                            ? "authTranslations.branch.actions.updateBranch.success"
                            : "authTranslations.branch.actions.createBranch.success",
                    ),
                );
                onSuccess?.();
            });
        },
    });

    return (
        <form
            className={cn("space-y-6")}
            onSubmit={(event) => {
                event.preventDefault();
                form.handleSubmit();
            }}
        >
            <FieldSet disabled={isPending}>
                <FieldGroup>
                    <form.AppField name="nameEn">
                        {(field) => (
                            <field.StringField
                                label={`${t("authTranslations.branch.create.nameLabel")} (EN)`}
                                placeholder={t("authTranslations.branch.create.namePlaceholder")}
                            />
                        )}
                    </form.AppField>

                    <form.AppField name="nameAr">
                        {(field) => (
                            <field.StringField
                                label={`${t("authTranslations.branch.create.nameLabel")} (AR)`}
                                placeholder={t("authTranslations.branch.create.namePlaceholder")}
                            />
                        )}
                    </form.AppField>
                </FieldGroup>

                <ButtonGroup className="justify-start">
                    <Button type="submit">
                        {isPending
                            ? t(
                                isEdit
                                    ? "authTranslations.branch.edit.submitting"
                                    : "authTranslations.branch.create.submitting",
                            )
                            : t(
                                isEdit
                                    ? "authTranslations.branch.edit.submit"
                                    : "authTranslations.branch.create.submit",
                            )}
                    </Button>
                </ButtonGroup>
            </FieldSet>
        </form>
    );
}
