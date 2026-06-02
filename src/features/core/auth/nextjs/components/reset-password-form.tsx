"use client";

import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/forms/hooks";
import { BackLink } from "@/components/general/back-link";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { FieldError, FieldSet } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { resetPasswordAction } from "@/features/core/auth/nextjs/actions";
import { passwordResetSubmissionSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";
import type { mainTranslations } from "@/features/core/i18n/global";
import type { TranslationKey } from "@/features/core/i18n/lib";

export function ResetPasswordForm({
  initialEmail = "",
}: {
  initialEmail?: string;
}) {
  const { t, dir } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useAppForm({
    defaultValues: { email: initialEmail, otp: "", password: "" },
    validators: { onSubmit: passwordResetSubmissionSchema },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const res = await resetPasswordAction(value);
        if (res.isError) {
          toast.error(res.message);
          return;
        }

        toast.success(
          res.message ?? t("authTranslations.profile.password.submit"),
        );
        router.push("/sign-in");
      });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldSet disabled={isPending}>
        <form.AppField name="email">
          {(field) => (
            <field.EmailField
              disabled={!!initialEmail}
              label={t("authTranslations.signIn.emailLabel")}
              placeholder="example@example.com"
            />
          )}
        </form.AppField>

        <div dir="ltr">
          <form.AppField name="otp" defaultMeta={{ isValid: false }}>
            {(field) => (
              <>
                <InputOTP
                  autoFocus
                  containerClassName="justify-center"
                  disabled={isPending}
                  maxLength={6}
                  onChange={(val) => field.handleChange(val)}
                  value={field.state.value}
                >
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={0}
                      aria-invalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    />
                    <InputOTPSlot
                      index={1}
                      aria-invalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    />
                    <InputOTPSlot
                      index={2}
                      aria-invalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot
                      index={3}
                      aria-invalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    />
                    <InputOTPSlot
                      index={4}
                      aria-invalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    />
                    <InputOTPSlot
                      index={5}
                      aria-invalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    />
                  </InputOTPGroup>
                </InputOTP>
                <FieldError
                  dir={dir}
                  errors={field.state.meta.errors.map((error) => ({
                    message: t(
                      error?.message as TranslationKey<typeof mainTranslations>,
                      {},
                    ),
                  }))}
                />
              </>
            )}
          </form.AppField>
        </div>

        <form.AppField name="password">
          {(field) => (
            <field.PasswordField
              label={t("authTranslations.passwordReset.newPasswordLabel")}
              placeholder={t("authTranslations.passwordPlaceholder")}
            />
          )}
        </form.AppField>
      </FieldSet>
      <ButtonGroup className="w-full gap-2">
        <BackLink href="/forgot-password" variant={"outline"} />
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button disabled={isPending || isSubmitting} type="submit">
              <LoadingSwap
                isLoading={isPending || isSubmitting}
                loadingText={t("loading")}
              >
                <SaveIcon />
                {t("authTranslations.passwordReset.reset.submit")}
              </LoadingSwap>
            </Button>
          )}
        </form.Subscribe>
      </ButtonGroup>
    </form>
  );
}
