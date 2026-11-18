import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { LegalPage } from "@/features/public-catalog/components/legal-page";
import { TERMS } from "@/features/public-catalog/lib/legal-content";

export default async function TermsPage() {
  const { t } = await getT();
  const locale = await getLocaleCookie();
  return (
    <LegalPage
      doc={TERMS[locale === "ar" ? "ar" : "en"]}
      fallbackBrand={String(t("appName"))}
      locale={locale}
    />
  );
}
