"use client";

import { UserLockIcon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
    changePasswordAction,
    createPasswordAction,
} from "@/features/core/auth/nextjs/actions";
import {
    changePasswordSchema,
    createPasswordSchema,
} from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

type PasswordFormProps = {
    callback?: () => void;
};

export function CreatePasswordForm({ callback }: PasswordFormProps) {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();

    const form = useAppForm({
        defaultValues: {
            newPassword: "",
            confirmPassword: "",
        },
        validators: {
            onSubmit: createPasswordSchema,
        },
        onSubmit: async ({ value }) => {
            startTransition(async () => {
                const result = await createPasswordAction(value);
                if (result.isError) {
                    toast.error(result.message ?? t("error", { error: "" }));
                    return;
                }

                toast.success(t("authTranslations.profile.password.submit"));
                form.reset();
                callback?.();
            });
        },
    });

    return (
        <form
            className={cn("space-y-4")}
            onSubmit={(event) => {
                event.preventDefault();
                form.handleSubmit();
            }}
        >
            <FieldSet disabled={isPending}>
                <FieldGroup>
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

                <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(isSubmitting) => (
                        <Button type="submit" disabled={isPending || isSubmitting}>
                            <LoadingSwap
                                isLoading={isPending || isSubmitting}
                                loadingText={t("authTranslations.profile.password.updating")}
                            >
                                <UserLockIcon />
                                {t("authTranslations.profile.password.submit")}
                            </LoadingSwap>
                        </Button>
                    )}
                </form.Subscribe>
            </FieldSet>
        </form>
    );
}

export function UpdatePasswordForm({ callback }: PasswordFormProps) {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();

    const form = useAppForm({
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
        validators: {
            onSubmit: changePasswordSchema,
        },
        onSubmit: async ({ value }) => {
            startTransition(async () => {
                const result = await changePasswordAction(value);
                if (result.isError) {
                    toast.error(result.message ?? t("error", { error: "" }));
                    return;
                }

                toast.success(t("authTranslations.profile.password.submit"));
                form.reset();
                callback?.();
            });
        },
    });

    return (
        <form
            className={cn("space-y-4")}
            onSubmit={(event) => {
                event.preventDefault();
                form.handleSubmit();
            }}
        >
            <FieldSet disabled={isPending}>
                <FieldGroup>
                    <form.AppField name="currentPassword">
                        {(field) => (
                            <field.PasswordField
                                label={t("authTranslations.profile.password.currentLabel")}
                            />
                        )}
                    </form.AppField>

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

                <form.Subscribe selector={(state) => state.isSubmitting}>
                    {(isSubmitting) => (
                        <Button type="submit" disabled={isPending || isSubmitting}>
                            <LoadingSwap
                                isLoading={isPending || isSubmitting}
                                loadingText={t("authTranslations.profile.password.updating")}
                            >
                                <UserLockIcon />
                                {t("authTranslations.profile.password.submit")}
                            </LoadingSwap>
                        </Button>
                    )}
                </form.Subscribe>
            </FieldSet>
        </form>
    );
}

export function ChangePasswordForm({
    isCreate,
    callback,
}: {
    isCreate?: boolean;
    callback?: () => void;
}) {
    if (isCreate) {
        return <CreatePasswordForm callback={callback} />;
    }

    return <UpdatePasswordForm callback={callback} />;
}
