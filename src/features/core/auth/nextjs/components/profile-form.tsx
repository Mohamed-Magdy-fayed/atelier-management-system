"use client";

import { useStore } from "@tanstack/react-form";
import {
    type SubmitEventHandler,
    useCallback,
    useTransition,
} from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { updateProfileNameAction } from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { defaultAvatar } from "@/features/core/auth/nextjs/components/user-avatar";
import { updateProfileSchema } from "@/features/core/auth/schemas";
import type { TypedResponse } from "@/features/core/auth/types";
import { useTranslation } from "@/features/core/i18n/client";

export function ProfileForm({ callback }: { callback?: () => void }) {
    const { session } = useAuth();
    const { t } = useTranslation();

    const [isPending, startTransition] = useTransition();

    const form = useAppForm({
        defaultValues: {
            name: session?.user.name ?? "",
            phone: session?.user.phone ?? null,
            imageUrl: session?.user.imageUrl ?? null,
            age: session?.user.age ?? null,
        },
        validators: {
            onSubmit: updateProfileSchema,
        },
        onSubmit: async ({ value }) => {
            startTransition(() => {
                toast.promise<
                    TypedResponse<{
                        updated: true;
                        message: string;
                    }>
                >(async () => await updateProfileNameAction(value), {
                    loading: t("authTranslations.profile.form.saving"),
                    success: () => {
                        callback?.();
                        return t("authTranslations.profile.form.submit");
                    },
                    error: t("authTranslations.profile.error.invalidInput"),
                });
            });
        },

    });
    const imageUrl = useStore(form.store, (state) => state.values.imageUrl);

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = useCallback(
        (e) => {
            e.preventDefault();
            form.handleSubmit();
        },
        [form],
    );

    return (
        <form className="space-y-5" onSubmit={handleSubmit}>
            <FieldSet disabled={isPending}>
                <FieldGroup>
                    <Avatar className="mx-auto size-12 border-2 rounded-full">
                        <AvatarImage src={imageUrl ? imageUrl : defaultAvatar} />
                        <AvatarFallback />
                    </Avatar>

                    <form.AppField name="name">
                        {(field) => (
                            <field.StringField
                                label={t("authTranslations.profile.name.label")}
                                placeholder={t("authTranslations.profile.name.placeholder")}
                            />
                        )}
                    </form.AppField>

                    <form.AppField name="phone">
                        {(field) => (
                            <field.MobileField
                                label={t("authTranslations.profile.phone.label")}
                                placeholder={t("authTranslations.profile.phone.placeholder")}
                            />
                        )}
                    </form.AppField>

                    <form.AppField name="imageUrl">
                        {(field) => (
                            <field.ImageField
                                label={t("authTranslations.profile.imageUrl.label")}
                                placeholder={t("authTranslations.profile.imageUrl.placeholder")}
                            />
                        )}
                    </form.AppField>

                    <form.AppField name="age">
                        {(field) => (
                            <field.NumberField
                                label={t("authTranslations.profile.age.label")}
                                placeholder={t("authTranslations.profile.age.placeholder")}
                            />
                        )}
                    </form.AppField>
                </FieldGroup>
                <form.Subscribe selector={({ isSubmitting }) => isSubmitting}>
                    {isPending
                        ? t("authTranslations.profile.form.saving")
                        : t("authTranslations.profile.form.submit")}
                </form.Subscribe>
            </FieldSet>
        </form>
    );
}
