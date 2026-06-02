import { MessageCircleIcon } from "lucide-react";

import { getT } from "@/features/core/i18n/server";
import { generateWhatsAppUrl } from "@/lib/phone";

export async function WhatsAppFloatButton() {
  const { t } = await getT();
  const url = generateWhatsAppUrl(
    "+201000000000",
    t("publicPages.finalCta.whatsappMessage"),
  );

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("publicPages.finalCta.ctaWhatsApp")}
      className="fixed bottom-20 end-4 z-50 hidden h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95 md:bottom-6 md:flex"
    >
      <MessageCircleIcon className="h-7 w-7" />
    </a>
  );
}
