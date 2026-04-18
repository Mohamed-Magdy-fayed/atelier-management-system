"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { FieldGroup } from "@/components/ui/field";
import { requestPasswordResetAction } from "@/features/core/auth/nextjs/actions";
import { passwordResetRequestSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";

export function ForgotPasswordForm() {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();

    const form = useAppForm({
        defaultValues: { phone: "" },
        validators: { onSubmit: passwordResetRequestSchema },
        onSubmit: async ({ value }) => {
            startTransition(async () => {
                const res = await requestPasswordResetAction(value);
                if (res.isError) {
                    toast.error(res.message || "");
                    return;
                }
            });
        },
    });

    return (
        <form className="space-y-6" onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
        }}>
            <FieldGroup>
                <form.AppField name="phone">
                    {(field) => (
                        <field.MobileField
                            autoFocus
                            label={t("authTranslations.signIn.phoneLabel")}
                            placeholder="012 3456789"
                        />
                    )}
                </form.AppField>
            </FieldGroup>
            <ButtonGroup className="w-full justify-end">
                <Button className="w-full" disabled={isPending} type="submit">
                    {isPending
                        ? t("authTranslations.passwordReset.submitting")
                        : t("authTranslations.passwordReset.submit")}
                </Button>
            </ButtonGroup>
        </form>
    );
}
