"use client";

import { useStore } from "@tanstack/react-form";
import { SaveIcon } from "lucide-react";
import {
  type FormEventHandler,
  useCallback,
  useId,
  useTransition,
} from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/forms/hooks";
import {
  OverlayFormBody,
  OverlayFormSubmitButton,
} from "@/components/forms/overlay-form";
import { SystemDialog } from "@/components/general/system-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { H4, Muted } from "@/components/ui/typography";
import { updateProfileNameAction } from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { defaultAvatar } from "@/features/core/auth/nextjs/components/user-avatar";
import { updateProfileSchema } from "@/features/core/auth/schemas";
import type { TypedResponse } from "@/features/core/auth/types";
import { useTranslation } from "@/features/core/i18n/client";

export function ProfileFormDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { session } = useAuth();
  const { t } = useTranslation();
  const formId = useId();

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
            onOpenChange(false);
            return t("authTranslations.profile.form.submit");
          },
          error: t("authTranslations.profile.error.invalidInput"),
        });
      });
    },
  });

  const imageUrl = useStore(form.store, (state) => state.values.imageUrl);

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault();
      form.handleSubmit();
    },
    [form],
  );

  return (
    <form.AppForm>
      <SystemDialog
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        titleRender={() => <H4>{t("authTranslations.profile.title")}</H4>}
        descriptionRender={() => (
          <Muted>{t("authTranslations.profile.description")}</Muted>
        )}
        actions={
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <OverlayFormSubmitButton
                className="w-full"
                disabled={isPending || isSubmitting}
                formId={formId}
              >
                <LoadingSwap
                  isLoading={isPending || isSubmitting}
                  loadingText={t("authTranslations.profile.form.saving")}
                >
                  <SaveIcon />
                  {t("authTranslations.profile.form.submit")}
                </LoadingSwap>
              </OverlayFormSubmitButton>
            )}
          </form.Subscribe>
        }
      >
        <OverlayFormBody
          className="space-y-4"
          formId={formId}
          onSubmit={handleSubmit}
        >
          <FieldSet disabled={isPending}>
            <FieldGroup>
              <Avatar className="mx-auto size-12 rounded-full border-2">
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
                    placeholder={t(
                      "authTranslations.profile.phone.placeholder",
                    )}
                  />
                )}
              </form.AppField>

              <form.AppField name="imageUrl">
                {(field) => (
                  <field.ImageField
                    label={t("authTranslations.profile.imageUrl.label")}
                    placeholder={t(
                      "authTranslations.profile.imageUrl.placeholder",
                    )}
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
          </FieldSet>
        </OverlayFormBody>
      </SystemDialog>
    </form.AppForm>
  );
}
