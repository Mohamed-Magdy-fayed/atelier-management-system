"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useTransition } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { updateProfileNameAction } from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { updateProfileSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";

export function ProfileForm({ callback }: { callback?: () => void }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const { session } = useAuth();

    const form = useAppForm({
        defaultValues: {
            name: session?.user.name ?? "",
        },
        validators: {
            onSubmit: updateProfileSchema,
        },
        onSubmit: async ({ value }) => {
            startTransition(async () => {
                try {
                    const res = await updateProfileNameAction(value);
                    if (res.isError) {
                        toast.error(
                            res.message ?? t("authTranslations.profile.error.invalidInput"),
                        );
                        return;
                    }
                    toast.success(
                        res.message ?? t("authTranslations.profile.form.submit"),
                    );
                    callback?.();
                    router.refresh();
                } catch (error) {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : t("authTranslations.profile.error.invalidInput"),
                    );
                }
            });
        },
    });

    const handleSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            form.handleSubmit();
        },
        [form],
    );

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <FieldSet disabled={isPending}>
                <FieldGroup>
                    <form.AppField name="name">
                        {(field) => (
                            <field.StringField
                                label={t("authTranslations.profile.name.label")}
                                placeholder={t("authTranslations.profile.name.placeholder")}
                            />
                        )}
                    </form.AppField>
                </FieldGroup>
                <ButtonGroup className="justify-end">
                    <Button disabled={isPending} type="submit">
                        {isPending
                            ? t("authTranslations.profile.form.saving")
                            : t("authTranslations.profile.form.submit")}
                    </Button>
                </ButtonGroup>
            </FieldSet>
        </form>
    );
}
