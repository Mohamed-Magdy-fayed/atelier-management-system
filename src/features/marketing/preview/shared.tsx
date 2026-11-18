import { Tajawal } from "next/font/google";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { env } from "@/env/server";
import { LeadForm } from "../components/lead-form";
import { COPY } from "../content";
import "./preview.css";

const font = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-pv",
  weight: ["400", "500", "700", "800"],
});

export const c = COPY.ar;

/** Previews exist for design review only and never ship to a live site. */
export function guardPreview() {
  if (process.env.NODE_ENV === "production") notFound();
}

export function PreviewFrame({
  current,
  children,
}: {
  current: "a" | "b" | "c";
  children: ReactNode;
}) {
  const label = {
    a: "A · المنتج الحقيقي",
    b: "B · أتيليه حقيقي",
    c: "C · رسالة واتساب",
  };
  return (
    <div className={`pv ${font.variable}`} dir="rtl" lang="ar">
      <div className="pv-bar">
        <b>معاينة داخلية، مش منشورة</b>
        {(["a", "b", "c"] as const).map((k) => (
          <Link
            aria-current={k === current ? "page" : undefined}
            href={`/preview/${k}`}
            key={k}
          >
            {label[k]}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}

export function Header({ onDark = false }: { onDark?: boolean }) {
  return (
    <header
      className="pv-wrap pv-head"
      style={onDark ? { color: "#fff" } : undefined}
    >
      <Link className="pv-logo" href="/preview/a">
        {/* biome-ignore lint/performance/noImgElement: tiny static brand mark */}
        <img alt="" height={32} src="/brand/gateling-mark.png" width={32} />
        Gateling Atelier
      </Link>
      <nav className="pv-nav">
        <a href="#features">{c.nav.features}</a>
        <a href="#pricing">{c.nav.pricing}</a>
        <a href="#faq">{c.nav.faq}</a>
      </nav>
      <a className="pv-btn" href="#start">
        {c.nav.cta}
      </a>
    </header>
  );
}

export function Trust() {
  return (
    <div className="pv-trust">
      <span>ابدأ مجاناً: فرع واحد و٣٠ فستان</span>
      <span>من غير كارت</span>
      <span>بنجهّز الأتيليه معاك</span>
    </div>
  );
}

/** The rest of the page is shared so the three directions differ where it matters: the first screen. */
export function Sections() {
  return (
    <>
      <section className="pv-sec" id="features">
        <div className="pv-wrap">
          <h2>{c.pains.title}</h2>
          <div className="pv-grid">
            {c.pains.items.map((i) => (
              <div key={i.title}>
                <h3>{i.title}</h3>
                <p>{i.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="pv-sec">
        <div className="pv-wrap">
          <h2>{c.features.title}</h2>
          <p className="pv-lead" style={{ marginTop: 0 }}>
            {c.features.lead}
          </p>
          <div className="pv-grid" style={{ marginTop: "2rem" }}>
            {c.features.items.map((i) => (
              <div key={i.title}>
                <h3>{i.title}</h3>
                <p>{i.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="pv-sec pv-dark">
        <div className="pv-wrap">
          <p
            style={{
              fontSize: "clamp(3rem,8vw,6rem)",
              fontWeight: 800,
              color: "var(--o)",
              margin: 0,
              lineHeight: 1,
            }}
          >
            {c.proof.stat}
          </p>
          <p style={{ fontSize: "1.3rem", margin: ".5rem 0 0" }}>
            {c.proof.statLabel}
          </p>
          <p className="pv-lead">{c.proof.detail}</p>
        </div>
      </section>
      <section className="pv-sec" id="pricing">
        <div className="pv-wrap">
          <h2>{c.pricing.title}</h2>
          <p className="pv-lead" style={{ marginTop: 0 }}>
            {c.pricing.lead}
          </p>
          <div className="pv-price">
            <div>
              <h3 style={{ margin: 0 }}>{c.pricing.freeName}</h3>
              <b>{c.pricing.freePrice}</b>
              <ul>
                {c.pricing.freeItems.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{c.pricing.paidName}</h3>
              <b>
                {c.pricing.paidPrice}{" "}
                <small style={{ fontSize: "1rem", fontWeight: 500 }}>
                  {c.pricing.paidPer}
                </small>
              </b>
              <span style={{ color: "var(--mut)", fontSize: ".9rem" }}>
                {c.pricing.paidApprox}
              </span>
              <ul>
                {c.pricing.paidItems.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className="pv-sec pv-faq" id="faq">
        <div className="pv-wrap">
          <h2>{c.faq.title}</h2>
          {c.faq.items.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="pv-sec" id="start">
        <div className="pv-wrap pv-form">
          <h2>{c.form.title}</h2>
          <p className="pv-lead" style={{ marginTop: 0 }}>
            {c.form.lead}
          </p>
          <LeadForm
            copy={c.form}
            locale="ar"
            whatsappNumber={env.SALES_WHATSAPP_NUMBER}
          />
        </div>
      </section>
      <footer className="pv-foot">
        <div className="pv-wrap">{c.footer.line}</div>
      </footer>
    </>
  );
}
