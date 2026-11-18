import { Muted } from "@/components/ui/typography";
import type { LegalDocument } from "@/features/public-catalog/lib/legal-content";
import { resolveBrandName } from "@/features/system/settings/lib/branding";
import { getBranding } from "@/features/system/settings/server/branding";

/** Renders a legal document with the install's business name substituted. */
export async function LegalPage({
  doc,
  locale,
  fallbackBrand,
}: {
  doc: LegalDocument;
  locale: string;
  fallbackBrand: string;
}) {
  const brand = resolveBrandName(await getBranding(), locale, fallbackBrand);
  const fill = (text: string) => text.replaceAll("{brand}", brand);

  return (
    <main className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-16 sm:px-6">
        <header className="space-y-2">
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
            {doc.title}
          </h1>
          <Muted className="text-sm">{doc.updated}</Muted>
        </header>
        {doc.sections.map((section) => (
          <section className="space-y-2" key={section.heading}>
            <h2 className="font-semibold text-lg">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p
                className="text-muted-foreground leading-relaxed"
                key={paragraph}
              >
                {fill(paragraph)}
              </p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
