"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import {
    changePasswordAction,
    createPasswordAction,
} from "@/features/core/auth/nextjs/actions";
import {
    changePasswordSchema as changePasswordFormSchema,
} from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

export function ChangePasswordForm({
    isCreate,
    callback,
}: {
    isCreate?: boolean;
    callback?: () => void;
}) {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();

    const form = useAppForm({
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
        validators: {
            onSubmit: changePasswordFormSchema,
        },
        onSubmit: async ({ value }) => {
            startTransition(async () => {
                if (isCreate) {
                    const result = await createPasswordAction({
                        newPassword: value.newPassword,
                        confirmPassword: value.confirmPassword,
                    });
                    if (result.isError) {
                        toast.error(result.message ?? t("error", { error: "" }));
                        return;
                    }
                } else {
                    const result = await changePasswordAction(value);
                    if (result.isError) {
                        toast.error(result.message ?? t("error", { error: "" }));
                        return;
                    }
                }

                toast.success(t("authTranslations.profile.password.submit"));
                form.reset();
                callback?.();
            });
        },
    });

    return (
        <form
            className={cn("space-y-5")}
            onSubmit={(event) => {
                event.preventDefault();
                form.handleSubmit();
            }}
        >
            <FieldSet disabled={isPending}>
                <FieldGroup>
                    {!isCreate ? (
                        <form.AppField name="currentPassword">
                            {(field) => (
                                <field.PasswordField
                                    label={t("authTranslations.profile.password.currentLabel")}
                                />
                            )}
                        </form.AppField>
                    ) : null}

                    <form.AppField name="newPassword">
                        {(field) => (
                            <field.PasswordField
                                label={t("authTranslations.profile.password.newLabel")}
                            />
                        )}
                    </form.AppField>

                    <form.AppField name="confirmPassword">
                        {(field) => (
                            <field.PasswordField
                                label={t("authTranslations.profile.password.confirmLabel")}
                            />
                        )}
                    </form.AppField>
                </FieldGroup>

                <ButtonGroup className="justify-end">
                    <Button type="submit">
                        {isPending
                            ? t("authTranslations.profile.password.updating")
                            : t("authTranslations.profile.password.submit")}
                    </Button>
                </ButtonGroup>
            </FieldSet>
        </form>
    );
}
