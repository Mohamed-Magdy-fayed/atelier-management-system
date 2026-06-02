import type { Metadata } from "next";

import { Container, Section } from "@/components/ui/containers";
import { getT } from "@/features/core/i18n/server";
import { generateWhatsAppUrl } from "@/lib/phone";

import { ContactForm } from "./_components/contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("publicPages.contactPage.metaTitle"),
    description: t("publicPages.contactPage.metaDescription"),
  };
}

export default async function ContactPage() {
  const { t } = await getT();
  const whatsappUrl = generateWhatsAppUrl(
    "+201000000000",
    t("publicPages.contactPage.whatsappMessage"),
  );

  const contactItems = [
    {
      icon: "📧",
      label: t("publicPages.contactPage.emailLabel"),
      value: "info@gateling.com",
      href: undefined,
    },
    {
      icon: "💬",
      label: t("publicPages.contactPage.whatsappLabel"),
      value: t("publicPages.contactPage.whatsappValue"),
      href: whatsappUrl,
    },
    {
      icon: "⏱",
      label: t("publicPages.contactPage.responseLabel"),
      value: t("publicPages.contactPage.responseValue"),
      href: undefined,
    },
  ];

  return (
    <Section>
      <Container size="wide">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold">
              {t("publicPages.contactPage.heading")}
            </h1>
            <p className="text-muted-foreground mt-4 text-lg">
              {t("publicPages.contactPage.subheading")}
            </p>

            <div className="mt-10 space-y-6">
              {contactItems.map((item) => (
                <div key={item.label} className="flex items-center gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-muted-foreground text-sm">
                      {item.label}
                    </p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary font-medium transition-colors"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <p className="font-medium">{item.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <ContactForm />
        </div>
      </Container>
    </Section>
  );
}
