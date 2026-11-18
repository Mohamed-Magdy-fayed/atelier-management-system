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

/** Direction B: a real atelier, real people (GlossGenius, Booqable). */
export default function PreviewB() {
  guardPreview();
  return (
    <PreviewFrame current="b">
      <section className="pv-photo">
        <Header onDark />
        <div className="pv-ph-label">
          صورة مؤقتة. هنستبدلها بصورة حقيقية من أتيليه آلاء (بإذنها) أو تصوير
          جديد.
        </div>
        <div
          className="pv-wrap"
          style={{ width: "100%", padding: "0 1.25rem 3.5rem" }}
        >
          <h1 className="pv-h1" style={{ maxWidth: "44rem" }}>
            {c.hero.title}
          </h1>
          <p className="pv-lead" style={{ color: "#e9e3de" }}>
            {c.hero.lead}
          </p>
          <div className="pv-row">
            <a className="pv-btn" href="#start">
              {c.hero.primary}
            </a>
            <a
              className="pv-btn pv-btn-line"
              href="#start"
              style={{ color: "#fff" }}
            >
              {c.hero.whatsapp}
            </a>
          </div>
          <div className="pv-trust" style={{ color: "#e9e3de" }}>
            <span>ابدأ مجاناً</span>
            <span>من غير كارت</span>
            <span>بنجهّز الأتيليه معاك</span>
          </div>
        </div>
      </section>
      <main>
        <Sections />
      </main>
      <div style={{ display: "none" }}>
        <Trust />
      </div>
    </PreviewFrame>
  );
}
