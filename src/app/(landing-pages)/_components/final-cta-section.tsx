import { ArrowRightIcon, MessageCircleIcon } from "lucide-react";

import { AnchorButton, LinkButton } from "@/components/general/link-button";
import { Container, Section } from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";
import { generateWhatsAppUrl } from "@/lib/phone";

export async function FinalCtaSection() {
  const { t } = await getT();
  const whatsappUrl = generateWhatsAppUrl(
    "+201000000000",
    t("publicPages.finalCta.whatsappMessage"),
  );

  return (
    <Section variant="primary">
      <Container className="text-center">
        <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
          {t("publicPages.finalCta.heading")}
        </h2>
        <p className="mt-4 text-lg opacity-90 md:text-xl">
          {t("publicPages.finalCta.description")}
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LinkButton
            href="/contact"
            size="lg"
            variant="secondary"
            className="min-w-[210px] shadow-lg"
          >
            {t("publicPages.finalCta.ctaContact")}
            <ArrowRightIcon className="ms-2 h-4 w-4" />
          </LinkButton>
          <AnchorButton
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            size="lg"
            variant="outline"
            className="min-w-[210px] border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10"
          >
            <MessageCircleIcon className="me-2 h-4 w-4" />
            {t("publicPages.finalCta.ctaWhatsApp")}
          </AnchorButton>
        </div>
      </Container>
    </Section>
  );
}
