"use client";

import {
  type AuthenticationResponseJSON,
  startAuthentication,
} from "@simplewebauthn/browser";
import { ArrowLeftIcon, FingerprintIcon, LogInIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Activity, useState, useTransition } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/hooks";
import { LinkButton } from "@/components/general/link-button";
import { Button } from "@/components/ui/button";
import {
  FieldDescription,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { H1, Muted } from "@/components/ui/typography";
import { type OAuthProvider, oAuthProviderValues } from "@/drizzle/schema";
import {
  beginPasskeyAuthenticationAction,
  completePasskeyAuthenticationAction,
  oAuthSignIn,
  signInAction,
} from "@/features/core/auth/nextjs/actions";
import FormAlert from "@/features/core/auth/nextjs/components/form-alert";
import { useOauthProviderIcon } from "@/features/core/auth/nextjs/components/useOauthProviderIcon";
import {
  signInEmailStepSchema,
  signInSchema,
} from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";

export function SignInForm() {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"email" | "password">("email");
  const searchParams = useSearchParams();
  const getOauthProviderIcon = useOauthProviderIcon();

  const form = useAppForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: signInSchema, onDynamic: signInEmailStepSchema },
    onSubmit: async ({ value }) => {
      startTransition(async () => {
        const result = await signInAction(value);
        if (result?.isError) {
          toast.error(result.message);
        }
      });
    },
  });

  async function handlePasskeySignIn() {
    const email = form.getFieldValue("email");
    if (!email) {
      toast.error(t("authTranslations.passkeys.auth.error.emailRequired"));
      return;
    }

    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      toast.error(t("authTranslations.passkeys.auth.error.unsupported"));
      return;
    }

    startTransition(async () => {
      let assertion: AuthenticationResponseJSON | null = null;
      try {
        const beginResult = await beginPasskeyAuthenticationAction(email);

        if (beginResult.isError) {
          toast.error(beginResult.message);
          return;
        }

        assertion = await startAuthentication({
          optionsJSON: beginResult.options as any,
        });
      } catch (error) {
        error instanceof Error
          ? toast.error(error.message)
          : toast.error(t("authTranslations.passkeys.auth.error.generic"));
      }

      if (!assertion) {
        toast.error(t("authTranslations.passkeys.auth.error.generic"));
        return;
      }
      await completePasskeyAuthenticationAction(email, assertion);
    });
  }

  async function handleOAuthClick(provider: OAuthProvider) {
    await oAuthSignIn(provider);
  }

  async function handleContinueEmail() {
    form.validateField("email", "submit");
    console.log(form.getFieldMeta("email"));

    if (!form.getFieldMeta("email")?.isValid) {
      return;
    }
    setStep("password");

    setTimeout(() => {
      const passwordInput = document.getElementById(
        "password",
      ) as HTMLInputElement;
      passwordInput?.focus();
    }, 100);
  }

  function handleBackToEmail() {
    setStep("email");
  }

  const isEmailStep = step === "email";

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "email") {
          handleContinueEmail();
        } else {
          form.handleSubmit();
        }
      }}
    >
      <div className="space-y-2 text-center">
        <H1>{t("authTranslations.signIn.title")}</H1>
        <Muted>{t("authTranslations.signIn.description")}</Muted>
      </div>

      {searchParams.get("error") != null && (
        <FormAlert message={searchParams.get("error") || ""} />
      )}
      {searchParams.get("oauthError") != null && (
        <FormAlert message={searchParams.get("oauthError") || ""} />
      )}

      {oAuthProviderValues.length > 0 && (
        <div className="grid gap-2">
          {oAuthProviderValues.map((provider) => (
            <Button
              className="h-11 w-full justify-center gap-2"
              disabled={isPending}
              key={provider}
              onClick={async () => await handleOAuthClick(provider)}
              type="button"
              variant="outline"
            >
              {getOauthProviderIcon(provider)}
              <span className="font-medium text-sm capitalize">{provider}</span>
            </Button>
          ))}
        </div>
      )}

      <FieldSeparator className="mb-2 *:data-[slot=field-separator-content]:bg-card">
        {t("authTranslations.signIn.continueWith")}
      </FieldSeparator>

      <FieldSet className="grid gap-4" disabled={isPending}>
        <Activity mode={isEmailStep ? "visible" : "hidden"}>
          <form.AppField name="email">
            {(field) => (
              <field.EmailField
                autoFocus
                placeholder="example@mail.com"
                label={t("authTranslations.signIn.emailLabel")}
              />
            )}
          </form.AppField>

          <Button
            className="w-full"
            disabled={isPending}
            onClick={handleContinueEmail}
            type="button"
          >
            <LoadingSwap isLoading={isPending}>
              <LogInIcon />
              {t("authTranslations.signIn.continue")}
            </LoadingSwap>
          </Button>
        </Activity>

        <Activity mode={isEmailStep ? "hidden" : "visible"}>
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label={t("authTranslations.signIn.passwordLabel")}
              />
            )}
          </form.AppField>

          <div className="flex w-full justify-end">
            <LinkButton href="/forgot-password" size="sm" variant="link">
              {t("authTranslations.signIn.forgotPassword")}
            </LinkButton>
          </div>

          <div className="flex items-center gap-2">
            <Button
              disabled={isPending}
              onClick={handleBackToEmail}
              type="button"
              variant="outline"
            >
              <ArrowLeftIcon className="rtl:rotate-180" />
              {t("authTranslations.signIn.back")}
            </Button>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  className="flex-1"
                  disabled={isPending || isSubmitting}
                  type="submit"
                >
                  <LoadingSwap
                    isLoading={isPending || isSubmitting}
                    loadingText={t("authTranslations.signIn.submitting")}
                  >
                    <LogInIcon />
                    {t("authTranslations.signIn.submit")}
                  </LoadingSwap>
                </Button>
              )}
            </form.Subscribe>
          </div>
        </Activity>

        <Button
          disabled={isPending}
          onClick={handlePasskeySignIn}
          type="button"
          variant="outline"
        >
          <FingerprintIcon />
          {isPending
            ? t("authTranslations.passkeys.auth.pending")
            : t("authTranslations.passkeys.auth.button")}
        </Button>
      </FieldSet>

      <FieldDescription className="text-center">
        {t("authTranslations.signIn.noAccount")}{" "}
        <LinkButton className="ps-0" href="/sign-up" variant="link">
          {t("authTranslations.signIn.toSignUp")}
        </LinkButton>
      </FieldDescription>
    </form>
  );
}
