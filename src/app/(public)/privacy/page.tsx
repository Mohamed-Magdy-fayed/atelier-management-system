import { getLocaleCookie, getT } from "@/features/core/i18n/server";
import { LegalPage } from "@/features/public-catalog/components/legal-page";
import { PRIVACY } from "@/features/public-catalog/lib/legal-content";

export default async function PrivacyPage() {
  const { t } = await getT();
  const locale = await getLocaleCookie();
  return (
    <LegalPage
      doc={PRIVACY[locale === "ar" ? "ar" : "en"]}
      fallbackBrand={String(t("appName"))}
      locale={locale}
    />
  );
}
