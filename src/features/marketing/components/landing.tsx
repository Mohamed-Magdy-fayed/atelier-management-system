import Link from "next/link";

import { COPY, type MarketingLocale, PRICE_EGP } from "../content";
import { DressCalendar } from "./dress-calendar";
import { LeadForm } from "./lead-form";

const CASE_STUDY_URL = "https://gateling.com/work/atelier-alaa-el-kasry";

export function Landing({
  locale,
  siteUrl,
  whatsappNumber,
}: {
  locale: MarketingLocale;
  siteUrl: string;
  whatsappNumber?: string;
}) {
  const c = COPY[locale];
  const waHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(c.hero.whatsapp)}`
    : undefined;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Gateling Atelier",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: c.meta.description,
      url: `${siteUrl}${locale === "ar" ? "/" : "/en"}`,
      inLanguage: locale,
      offers: [
        {
          "@type": "Offer",
          price: 0,
          priceCurrency: "EGP",
          name: c.pricing.freeName,
        },
        {
          "@type": "Offer",
          price: PRICE_EGP,
          priceCurrency: "EGP",
          name: c.pricing.paidName,
        },
      ],
      publisher: {
        "@type": "Organization",
        name: "Gateling Solutions",
        url: "https://gateling.com",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: c.faq.items.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <div
      className="mk min-h-dvh"
      dir={locale === "ar" ? "rtl" : "ltr"}
      lang={locale}
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static, server-built JSON-LD
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Link
          className="mk-display flex items-center gap-2.5 text-xl font-bold text-[var(--mk-ink)]"
          href={locale === "ar" ? "/" : "/en"}
        >
          {/* biome-ignore lint/performance/noImgElement: tiny static brand mark */}
          <img
            alt=""
            className="size-8"
            height={32}
            src="/brand/gateling-mark.png"
            width={32}
          />
          Gateling Atelier
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <a href="#features">{c.nav.features}</a>
          <a href="#pricing">{c.nav.pricing}</a>
          <a href="#faq">{c.nav.faq}</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            className="text-sm underline-offset-4 hover:underline"
            href={c.footer.otherHref}
          >
            {c.footer.other}
          </Link>
          <a className="mk-btn !px-4 !py-2 text-sm" href="#start">
            {c.nav.cta}
          </a>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <p className="mk-muted mb-4 text-sm font-medium">
              {c.hero.eyebrow}
            </p>
            <h1 className="mk-display text-balance text-5xl font-bold leading-[1.15] text-[var(--mk-ink)] md:text-6xl">
              {c.hero.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg">{c.hero.lead}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a className="mk-btn" href="#start">
                {c.hero.primary}
              </a>
              {waHref ? (
                <a
                  className="mk-btn mk-btn-ghost"
                  href={waHref}
                  rel="noopener"
                  target="_blank"
                >
                  {c.hero.whatsapp}
                </a>
              ) : null}
            </div>
            <p className="mk-muted mt-5 text-sm">{c.hero.note}</p>
          </div>
          <DressCalendar copy={c.calendar} locale={locale} />
        </section>

        <section className="mk-rule bg-[var(--mk-paper)]">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="mk-display mb-10 max-w-2xl text-3xl font-bold md:text-4xl">
              {c.pains.title}
            </h2>
            <ol className="grid gap-px overflow-hidden rounded-2xl border border-[var(--mk-line)] bg-[var(--mk-line)] md:grid-cols-3">
              {c.pains.items.map((p, i) => (
                <li className="bg-[var(--mk-paper)] p-7" key={p.title}>
                  <span className="mk-display text-4xl text-[var(--mk-gold)]">
                    {(i + 1).toLocaleString(locale === "ar" ? "ar-EG" : "en")}
                  </span>
                  <h3 className="mt-3 text-lg font-bold">{p.title}</h3>
                  <p className="mk-muted mt-2">{p.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20" id="features">
          <h2 className="mk-display text-3xl font-bold md:text-4xl">
            {c.features.title}
          </h2>
          <p className="mk-muted mt-3 max-w-xl">{c.features.lead}</p>
          <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.items.map((f) => (
              <li className="mk-rule pt-5" key={f.title}>
                <h3 className="font-bold">{f.title}</h3>
                <p className="mk-muted mt-1.5">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-[var(--mk-ink)] text-[var(--mk-bg)]">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-[auto_1fr]">
            <div>
              <p className="mk-display text-6xl font-bold text-[var(--mk-gold)] md:text-7xl">
                {c.proof.stat}
              </p>
              <p className="mt-1 text-lg">{c.proof.statLabel}</p>
            </div>
            <div>
              <h2 className="mk-display text-2xl font-bold md:text-3xl">
                {c.proof.title}
              </h2>
              <p className="mt-3 max-w-2xl opacity-90">{c.proof.detail}</p>
              <a
                className="mt-5 inline-block underline underline-offset-4"
                href={CASE_STUDY_URL}
                rel="noopener"
                target="_blank"
              >
                {c.proof.link}
              </a>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-20" id="pricing">
          <h2 className="mk-display text-3xl font-bold md:text-4xl">
            {c.pricing.title}
          </h2>
          <p className="mk-muted mt-3">{c.pricing.lead}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div className="mk-card rounded-3xl p-8">
              <p className="font-bold">{c.pricing.paidName}</p>
              <p className="mk-display mt-3 text-5xl font-bold text-[var(--mk-ink)]">
                {c.pricing.paidPrice}
              </p>
              <p className="mk-muted mt-1">
                {c.pricing.paidPer} · {c.pricing.paidApprox}
              </p>
              <ul className="mt-6 grid gap-2">
                {c.pricing.paidItems.map((i) => (
                  <li className="flex gap-3" key={i}>
                    <span aria-hidden className="text-[var(--mk-gold)]">
                      ✓
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
              <p className="mk-muted mt-6 text-sm">{c.pricing.discounts}</p>
            </div>
            <div className="rounded-3xl border border-dashed border-[var(--mk-line)] p-8">
              <p className="font-bold">{c.pricing.freeName}</p>
              <p className="mk-display mt-3 text-4xl font-bold">
                {c.pricing.freePrice}
              </p>
              <ul className="mt-6 grid gap-2">
                {c.pricing.freeItems.map((i) => (
                  <li className="flex gap-3" key={i}>
                    <span aria-hidden className="text-[var(--mk-gold)]">
                      ✓
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
              <a className="mk-btn mk-btn-ghost mt-8" href="#start">
                {c.pricing.cta}
              </a>
            </div>
          </div>
        </section>

        <section className="mk-rule bg-[var(--mk-paper)]" id="start">
          <div className="mx-auto max-w-3xl px-5 py-20">
            <h2 className="mk-display text-3xl font-bold md:text-4xl">
              {c.form.title}
            </h2>
            <p className="mk-muted mb-8 mt-3">{c.form.lead}</p>
            <LeadForm
              copy={c.form}
              locale={locale}
              whatsappNumber={whatsappNumber}
            />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-20" id="faq">
          <h2 className="mk-display mb-8 text-3xl font-bold md:text-4xl">
            {c.faq.title}
          </h2>
          <div className="mk-rule">
            {c.faq.items.map((f) => (
              <details
                className="mk-rule group py-5 first:border-t-0"
                key={f.q}
              >
                <summary className="cursor-pointer list-none font-bold marker:hidden">
                  {f.q}
                </summary>
                <p className="mk-muted mt-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="mk-rule">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm">
          <span>{c.footer.line}</span>
        </div>
      </footer>
    </div>
  );
}
