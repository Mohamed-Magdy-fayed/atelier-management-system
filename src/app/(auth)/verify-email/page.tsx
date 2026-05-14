import { HomeIcon } from "lucide-react";
import { Suspense } from "react";

import { LinkButton } from "@/components/general/link-button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";
import { H3 } from "@/components/ui/typography";
import { verifyEmailTokenAction } from "@/features/core/auth/nextjs/actions/email";
import { getT } from "@/features/core/i18n/server";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token: string }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { t } = await getT();
  const { token } = await searchParams;

  return (
    <div className="flex h-full flex-col items-stretch justify-between gap-4 p-4">
      <H3>{t("authTranslations.emailVerification.heading")}</H3>
      <Suspense
        fallback={
          <Status className="mx-auto" variant="default">
            <StatusIndicator />
            <StatusLabel>
              {t("authTranslations.emailVerification.notice.sending")}
            </StatusLabel>
          </Status>
        }
      >
        <VerificationResult token={token ?? undefined} />
      </Suspense>

      <LinkButton href="/">
        <HomeIcon />
        {t("authTranslations.emailVerification.backHome")}
      </LinkButton>
    </div>
  );
}

async function VerificationResult({ token }: { token?: string }) {
  const { t } = await getT();

  if (!token) {
    return (
      <ResultState
        description={t("authTranslations.emailVerification.error.invalidToken")}
        variant="error"
      />
    );
  }

  const result = await verifyEmailTokenAction({ token });

  if (result.isError) {
    return <ResultState description={result.message} variant="error" />;
  }

  const description =
    result.status === "changed"
      ? t("authTranslations.emailVerification.success.changed")
      : t("authTranslations.emailVerification.success.verified");

  return <ResultState description={description} variant="success" />;
}

function ResultState({
  variant,
  description,
}: {
  variant: "success" | "error";
  description: string;
}) {
  const variantLabel =
    variant === "success"
      ? "authTranslations.emailVerification.description.success"
      : "authTranslations.emailVerification.description.error";

  return (
    <div className="flex justify-center">
      <Status variant={variant === "success" ? "success" : "error"}>
        <StatusIndicator />
        <StatusLabel>{description}</StatusLabel>
        <span className="sr-only">{variantLabel}</span>
      </Status>
    </div>
  );
}
