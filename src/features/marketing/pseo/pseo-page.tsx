import Link from "next/link";

import { env } from "@/env/server";
import { ALL_ROWS, visibleRows } from "./index";
import { FAMILY_META, type PseoFamily, type PseoRow, rowPath } from "./types";

const siteUrl = () => env.BASE_URL.replace(/\/$/, "");

function ctaHref(slug: string) {
  return `/start?src=pseo&page=${encodeURIComponent(slug)}#start`;
}

function waHref(slug: string) {
  if (!env.SALES_WHATSAPP_NUMBER) return undefined;
  const text = `مرحباً، عايز أعرف أكتر عن البرنامج (من صفحة: ${slug})`;
  return `https://wa.me/${env.SALES_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function Shell({
  children,
  jsonLd,
}: {
  children: React.ReactNode;
  jsonLd: object[];
}) {
  return (
    <div className="mk min-h-dvh" dir="rtl" lang="ar">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static, server-built JSON-LD
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link
          className="mk-display text-xl font-bold text-[var(--mk-ink)]"
          href="/start"
        >
          Gateling Atelier
        </Link>
        <Link
          className="text-sm underline-offset-4 hover:underline"
          href="/start"
        >
          عن البرنامج
        </Link>
      </header>
      {children}
      <footer className="mk-rule mt-16">
        <div className="mx-auto max-w-3xl px-5 py-8 text-sm">
          Gateling Atelier من Gateling Solutions
        </div>
      </footer>
    </div>
  );
}

function Cta({ slug }: { slug: string }) {
  const wa = waHref(slug);
  return (
    <aside className="mk-card my-12 rounded-3xl p-7">
      <p className="mk-display text-2xl font-bold">جرّب البرنامج على فساتينك</p>
      <p className="mk-muted mt-2">
        ٥٠٠ جنيه للفرع في الشهر (حوالي ١٠ دولار)، ونسخة مجانية لفرع واحد. بنجهّز
        الأتيليه ونعلّم الموظفين.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="mk-btn" href={ctaHref(slug)}>
          اطلب تجربة مجانية
        </Link>
        {wa ? (
          <a
            className="mk-btn mk-btn-ghost"
            href={wa}
            rel="noopener"
            target="_blank"
          >
            اسأل على واتساب
          </a>
        ) : null}
      </div>
    </aside>
  );
}

export function PseoPage({ row }: { row: PseoRow }) {
  const meta = FAMILY_META[row.family];
  const base = siteUrl();
  const url = `${base}${rowPath(row)}`;
  const related = row.related
    .map((r) => visibleRows(r.family).find((x) => x.slug === r.slug))
    .filter((x): x is PseoRow => Boolean(x))
    .slice(0, 6);
  const steps = row.sections.flatMap((s) => s.steps ?? []);

  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Gateling Atelier",
          item: `${base}/start`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: meta.crumb,
          item: `${base}/ar/${meta.path}`,
        },
        { "@type": "ListItem", position: 3, name: row.h1, item: url },
      ],
    },
  ];
  if (row.faq.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: row.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  if (row.family === "hulul" && steps.length > 0) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: row.h1,
      step: steps.map((s) => ({
        "@type": "HowToStep",
        name: s.title,
        text: s.body,
      })),
    });
  }

  return (
    <Shell jsonLd={jsonLd}>
      <main className="mx-auto max-w-3xl px-5 pt-6">
        <nav aria-label="breadcrumb" className="mk-muted mb-6 text-sm">
          <Link href="/start">الرئيسية</Link> ‹{" "}
          <Link href={`/ar/${meta.path}`}>{meta.crumb}</Link>
        </nav>
        {!row.published ? (
          <p className="mb-6 rounded-xl border border-[#b3261e] px-4 py-2 text-sm text-[#b3261e]">
            مسودة للمراجعة. غير منشورة وغير مفهرسة.
          </p>
        ) : null}
        <h1 className="mk-display text-balance text-4xl font-bold leading-[1.25] text-[var(--mk-ink)] md:text-5xl">
          {row.h1}
        </h1>
        <p className="mt-5 text-lg">{row.intro}</p>

        {row.dataPoints?.length ? (
          <dl className="mk-card mt-8 grid gap-4 rounded-2xl p-6">
            {row.dataPoints.map((d) => (
              <div key={d.label}>
                <dt className="mk-muted text-sm">{d.label}</dt>
                <dd className="mk-display text-4xl font-bold text-[var(--mk-ink)]">
                  {d.value}
                </dd>
                <p className="mk-muted text-xs">المصدر: {d.source}</p>
              </div>
            ))}
          </dl>
        ) : null}

        {row.sections.map((s) => (
          <section className="mt-10" key={s.h2}>
            <h2 className="mk-display text-2xl font-bold">{s.h2}</h2>
            {s.paragraphs?.map((t) => (
              <p className="mt-3" key={t}>
                {t}
              </p>
            ))}
            {s.steps ? (
              <ol className="mt-4 grid gap-5">
                {s.steps.map((st, i) => (
                  <li className="mk-rule pt-4" key={st.title}>
                    <h3 className="font-bold">
                      <span className="mk-display ms-2 text-[var(--mk-gold)]">
                        {(i + 1).toLocaleString("ar-EG")}.
                      </span>
                      {st.title}
                    </h3>
                    <p className="mk-muted mt-1">{st.body}</p>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        ))}

        {row.template ? (
          <section className="mt-10">
            <h2 className="mk-display text-2xl font-bold">
              {row.template.heading}
            </h2>
            <div className="mk-card mt-4 select-all whitespace-pre-wrap rounded-2xl p-6 leading-loose">
              {row.template.lines.join("\n")}
            </div>
            <p className="mk-muted mt-3 text-sm">{row.template.note}</p>
          </section>
        ) : null}

        {row.comparison?.length ? (
          <section className="mt-10">
            <h2 className="mk-display text-2xl font-bold">
              بالإيد ولا بالبرنامج
            </h2>
            <ul className="mt-4 grid gap-3">
              {row.comparison.map((c) => (
                <li className="mk-card rounded-2xl p-5" key={c.aspect}>
                  <p className="font-bold">{c.aspect}</p>
                  <p className="mk-muted mt-2">
                    <span className="font-bold">بالإيد: </span>
                    {c.manual}
                  </p>
                  <p className="mt-1">
                    <span className="font-bold text-[var(--mk-ink)]">
                      بالبرنامج:{" "}
                    </span>
                    {c.system}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <Cta slug={row.slug} />

        {row.faq.length ? (
          <section>
            <h2 className="mk-display mb-4 text-2xl font-bold">أسئلة بتتسأل</h2>
            {row.faq.map((f) => (
              <details className="mk-rule py-4" key={f.q}>
                <summary className="cursor-pointer list-none font-bold marker:hidden">
                  {f.q}
                </summary>
                <p className="mk-muted mt-2">{f.a}</p>
              </details>
            ))}
          </section>
        ) : null}

        {related.length ? (
          <section className="mt-12">
            <h2 className="mk-display mb-4 text-xl font-bold">اقرأ كمان</h2>
            <ul className="grid gap-2">
              {related.map((r) => (
                <li key={`${r.family}/${r.slug}`}>
                  <Link
                    className="underline underline-offset-4"
                    href={rowPath(r)}
                  >
                    {r.h1}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  className="underline underline-offset-4"
                  href={`/ar/${meta.path}`}
                >
                  كل {meta.crumb}
                </Link>
              </li>
            </ul>
          </section>
        ) : null}
      </main>
    </Shell>
  );
}

export function PseoHub({ family }: { family: PseoFamily }) {
  const meta = FAMILY_META[family];
  const rows = visibleRows(family);
  return (
    <Shell jsonLd={[]}>
      <main className="mx-auto max-w-3xl px-5 pt-6">
        <h1 className="mk-display text-4xl font-bold text-[var(--mk-ink)]">
          {meta.hubTitle}
        </h1>
        <p className="mk-muted mt-3">{meta.hubLead}</p>
        <ul className="mt-8 grid gap-3">
          {rows.map((r) => (
            <li className="mk-rule pt-3" key={r.slug}>
              <Link
                className="font-bold underline-offset-4 hover:underline"
                href={rowPath(r)}
              >
                {r.h1}
              </Link>
            </li>
          ))}
        </ul>
        <Cta slug={`hub-${family}`} />
      </main>
    </Shell>
  );
}

export { ALL_ROWS };
