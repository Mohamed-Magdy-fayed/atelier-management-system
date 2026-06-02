"use client";

import { UserPlus2Icon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/forms";
import { Button } from "@/components/ui/button";
import {
  FieldDescription,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { type OAuthProvider, oAuthProviderValues } from "@/drizzle/schema";
import { oAuthSignIn, signUpAction } from "@/features/core/auth/nextjs/actions";
import FormAlert from "@/features/core/auth/nextjs/components/form-alert";
import { useOauthProviderIcon } from "@/features/core/auth/nextjs/components/useOauthProviderIcon";
import { signUpSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";

export function SignUpForm() {
  const { t } = useTranslation();

  const [isPending, startTransition] = useTransition();

  const searchParams = useSearchParams();
  const getOauthProviderIcon = useOauthProviderIcon();

  const form = useAppForm({
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: ({ value }) => {
      toast.promise(signUpAction(value), {
        loading: t("authTranslations.signUp.submitting"),
        success: (res) =>
          !res.isError
            ? t("authTranslations.signUp.welcome", { name: res.user.name })
            : t("error", { error: res.message }),
        error: (error) => t("error", { error: error.message }),
      });
    },
  });

  async function handleOAuthClick(provider: OAuthProvider) {
    startTransition(() => {
      oAuthSignIn(provider);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4 p-6 md:p-8"
    >
      <div className="space-y-2 text-center">
        <h1 className="font-semibold text-3xl tracking-tight">
          {t("authTranslations.signUp.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("authTranslations.signUp.description")}
        </p>
      </div>

      {searchParams.get("error") && (
        <FormAlert message={searchParams.get("error") || ""} />
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

      <FieldSet
        className="grid gap-2"
        disabled={isPending || form.state.isSubmitting}
      >
        <form.AppField name="name">
          {({ StringField }) => (
            <StringField label={t("authTranslations.signUp.nameLabel")} />
          )}
        </form.AppField>

        <form.AppField name="email">
          {({ EmailField }) => (
            <EmailField
              placeholder={t("authTranslations.emailPlaceholder")}
              label={t("authTranslations.signUp.emailLabel")}
            />
          )}
        </form.AppField>

        <form.AppField name="phone">
          {({ MobileField }) => (
            <MobileField label={t("authTranslations.signUp.phoneLabel")} />
          )}
        </form.AppField>

        <form.AppField name="password">
          {({ PasswordField }) => (
            <PasswordField label={t("authTranslations.signUp.passwordLabel")} />
          )}
        </form.AppField>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              className="w-full"
              disabled={isPending || isSubmitting}
              type="submit"
            >
              <LoadingSwap
                isLoading={isPending || isSubmitting}
                loadingText={t("authTranslations.signUp.submitting")}
              >
                <UserPlus2Icon />
                {t("authTranslations.signUp.submit")}
              </LoadingSwap>
            </Button>
          )}
        </form.Subscribe>
      </FieldSet>

      <FieldDescription className="text-center">
        {t("authTranslations.signIn.hasAccount")}{" "}
        <Link
          className="font-medium underline-offset-4 hover:underline"
          href={"/sign-in"}
        >
          {t("authTranslations.signUp.toSignIn")}
        </Link>
      </FieldDescription>
    </form>
  );
}
