import type { Metadata } from "next";

import {
  c,
  guardPreview,
  Header,
  PreviewFrame,
  Sections,
  Trust,
} from "@/features/marketing/preview/shared";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Direction A: the real product, nothing else (Fresha, Daftra). */
export default function PreviewA() {
  guardPreview();
  return (
    <PreviewFrame current="a">
      <Header />
      <main>
        <section className="pv-wrap" style={{ padding: "3rem 1.25rem 3.5rem" }}>
          <h1 className="pv-h1" style={{ maxWidth: "46rem" }}>
            {c.hero.title}
          </h1>
          <p className="pv-lead">{c.hero.lead}</p>
          <div className="pv-row">
            <a className="pv-btn" href="#start">
              {c.hero.primary}
            </a>
            <a className="pv-btn pv-btn-line" href="#start">
              {c.hero.whatsapp}
            </a>
          </div>
          <Trust />
          <div className="pv-shot" style={{ marginTop: "3rem" }}>
            {/* biome-ignore lint/performance/noImgElement: static review asset */}
            <img
              alt="شاشة الحجوزات في البرنامج"
              src="/preview/product-reservations.jpg"
            />
          </div>
          <p className="pv-cap">
            <span className="pv-tag">بيانات تجريبية</span> شاشة الحجوزات
            الحقيقية في البرنامج، بأسماء وأرقام وهمية.
          </p>
        </section>
        <Sections />
      </main>
    </PreviewFrame>
  );
}
