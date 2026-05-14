"use client";

import { SendIcon } from "lucide-react";
import {
  Activity,
  type FormEventHandler,
  useCallback,
  useId,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/forms/hooks";
import {
  OverlayFormBody,
  OverlayFormSubmitButton,
} from "@/components/forms/overlay-form";
import { SystemDialog } from "@/components/general/system-dialog";
import { FieldDescription, FieldGroup, FieldSet } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { H4, Muted } from "@/components/ui/typography";
import { beginEmailChangeAction } from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { EmailVerificationNotice } from "@/features/core/auth/nextjs/components/email-verification-notice";
import { changeEmailSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";

export function ChangeEmailFormDialog({
  isOpen,
  onOpenChange,
  isEmailVerified,
  userEmail,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEmailVerified: boolean;
  userEmail: string | null;
}) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const formId = useId();

  const currentEmail = session?.user.email;
  const hasEmail = !!currentEmail;
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useAppForm({
    defaultValues: {
      newEmail: "",
      confirmEmail: "",
      currentPassword: "",
    },
    validators: {
      onSubmit: changeEmailSchema,
    },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        setErrorMessage(null);
        setStatus("idle");
        try {
          const res = await beginEmailChangeAction(value);
          if (res.isError) {
            setErrorMessage(
              res.message ?? t("authTranslations.profile.email.error.generic"),
            );
            return;
          }
          setStatus("sent");
          toast.success(t("authTranslations.emailVerification.sent"));
        } catch (error) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : t("authTranslations.profile.email.error.generic"),
          );
        }
      });
    },
  });

  const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
    (e) => {
      e.preventDefault();
      form.handleSubmit();
    },
    [form],
  );

  const description = useMemo(() => {
    if (errorMessage) return errorMessage;
    if (status === "sent")
      return t("authTranslations.profile.email.checkInbox");
    return hasEmail
      ? t("authTranslations.profile.email.description")
      : t("authTranslations.profile.email.addDescription");
  }, [errorMessage, hasEmail, status, t]);

  return (
    <form.AppForm>
      <SystemDialog
        descriptionRender={() => <Muted>{userEmail}</Muted>}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        titleRender={() => (
          <H4>{t("authTranslations.emailVerification.notice.title")}</H4>
        )}
        actions={
          isEmailVerified || !hasEmail ? (
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <OverlayFormSubmitButton
                  className="w-full"
                  disabled={isPending || isSubmitting}
                  formId={formId}
                >
                  <LoadingSwap
                    isLoading={isPending || isSubmitting}
                    loadingText={t("authTranslations.profile.email.sending")}
                  >
                    <SendIcon />
                    {hasEmail
                      ? t("authTranslations.profile.email.submit")
                      : t("authTranslations.profile.email.addSubmit")}
                  </LoadingSwap>
                </OverlayFormSubmitButton>
              )}
            </form.Subscribe>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-4">
          <EmailVerificationNotice
            isVerified={isEmailVerified}
            onClose={() => onOpenChange(false)}
          />
          <Activity mode={isEmailVerified || !hasEmail ? "visible" : "hidden"}>
            <OverlayFormBody
              className="space-y-4"
              formId={formId}
              onSubmit={handleSubmit}
            >
              <p>{description}</p>
              <FieldSet className="space-y-4" disabled={isPending}>
                <FieldGroup>
                  {hasEmail ? (
                    <FieldDescription className="text-start text-sm text-muted-foreground">
                      {t("authTranslations.profile.email.current")}{" "}
                      {currentEmail}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-start text-sm text-muted-foreground">
                      {t("authTranslations.profile.email.noCurrent")}
                    </FieldDescription>
                  )}

                  <form.AppField name="newEmail">
                    {(field) => (
                      <field.EmailField
                        autoFocus
                        label={
                          hasEmail
                            ? t("authTranslations.profile.email.newLabel")
                            : t("authTranslations.profile.email.addLabel")
                        }
                        placeholder={t("authTranslations.emailPlaceholder")}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="confirmEmail">
                    {(field) => (
                      <field.EmailField
                        label={t("authTranslations.profile.email.confirmLabel")}
                        placeholder={t("authTranslations.emailPlaceholder")}
                      />
                    )}
                  </form.AppField>

                  <form.AppField name="currentPassword">
                    {(field) => (
                      <field.PasswordField
                        label={t(
                          "authTranslations.profile.email.currentPasswordLabel",
                        )}
                      />
                    )}
                  </form.AppField>
                </FieldGroup>
              </FieldSet>
            </OverlayFormBody>
          </Activity>
        </div>
      </SystemDialog>
    </form.AppForm>
  );
}
