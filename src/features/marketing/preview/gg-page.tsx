import { existsSync } from "node:fs";
import path from "node:path";
import { Noto_Naskh_Arabic, Tajawal } from "next/font/google";
import { notFound } from "next/navigation";

import { env } from "@/env/server";
import { LeadForm } from "../components/lead-form";
import { COPY } from "../content";
import "./gg.css";

const head = Noto_Naskh_Arabic({
  subsets: ["arabic", "latin"],
  variable: "--font-gg-head",
  weight: ["500", "600", "700"],
});
const body = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-gg-body",
  weight: ["400", "500", "700", "800"],
});

const c = COPY.ar;

/** Real wording of the confirmation the app sends (`whatsappReservation*` in i18n/ar.ts), demo data. */
const MESSAGE = [
  "أهلاً سلمى،",
  "",
  "تم تأكيد حجزك في أتيليه الزمالك. رقم الحجز: RES-ZML-20261117-019",
  "",
  "الفستان: Ivory Lace Cathedral Wedding Gown (ZML-D-001)",
  "الاستلام: ٢٥ نوفمبر ٢٠٢٦، ٦:٠٠ م",
  "الإرجاع: ٢٩ نوفمبر ٢٠٢٦، ٦:٠٠ م",
  "",
  "الإجمالي: ٢٬١٠٠ ج.م.",
  "المدفوع: ٧٥٠ ج.م.",
  "المتبقي: ١٬٣٥٠ ج.م.",
].join("\n");

const STEPS = [
  {
    n: "١",
    t: "سجّلي الحجز",
    d: "اختاري الفستان والتاريخ. لو محجوز، البرنامج يمنعك.",
  },
  {
    n: "٢",
    t: "العروسة تستلم رسالة",
    d: "الفستان والاستلام والإرجاع والمتبقي، على واتساب.",
  },
  { n: "٣", t: "سجّلي العربون", d: "كل دفعة تتسجل، والباقي يتحسب لوحده." },
  {
    n: "٤",
    t: "تابعي المرتجعات",
    d: "تعرفي مين لازم يرجّع النهارده وتسجّلي الاسترجاع بضغطة.",
  },
];

export function GlossStylePage() {
  if (process.env.NODE_ENV === "production") notFound();
  // Drop real atelier footage at public/preview/hero.mp4 and it replaces the placeholder.
  const hasVideo = existsSync(
    path.join(process.cwd(), "public/preview/hero.mp4"),
  );

  return (
    <div className={`gg ${head.variable} ${body.variable}`} dir="rtl" lang="ar">
      <div className="gg-bannerlabel">
        <b>معاينة داخلية، مش منشورة.</b> التصميم على نمط GlossGenius، أضيق،
        بالعربي.
      </div>
      <header className="gg-bar">
        <div className="gg-w">
          <a className="gg-logo" href="/preview">
            {/* biome-ignore lint/performance/noImgElement: tiny static brand mark */}
            <img alt="" height={30} src="/brand/gateling-mark.png" width={30} />
            Gateling Atelier
          </a>
          <nav className="gg-nav">
            <a href="#how">كيف يشتغل</a>
            <a href="#features">المميزات</a>
            <a href="#pricing">الأسعار</a>
            <a href="#faq">أسئلة</a>
          </nav>
          <a className="gg-pill tint" href="#start">
            اسأل على واتساب
          </a>
          <a className="gg-pill fill" href="#start">
            {c.nav.cta}
          </a>
        </div>
      </header>

      <main>
        <div className="gg-w">
          <section className="gg-hero">
            <div className="gg-ph" />
            {hasVideo ? (
              <video autoPlay loop muted playsInline src="/preview/hero.mp4" />
            ) : (
              <div className="gg-label">
                فيديو مؤقت. هنحط هنا لقطات حقيقية من أتيليه شغّال (أتيليه آلاء
                بإذنها أو تصوير جديد).
              </div>
            )}
            <div className="gg-hero-in">
              <h1 className="gg-serif">
                مفيش فستان يتحجز مرتين. والباقي يمشي لوحده.
              </h1>
              <p>
                الحجوزات والعربون والمرتجعات وكل فروعك على موبايلك، بدل الدفتر
                والمكالمات.
              </p>
              <div className="gg-row">
                <a className="gg-pill w" href="#start">
                  {c.hero.primary}
                </a>
                <a className="gg-pill o" href="#start">
                  {c.hero.whatsapp}
                </a>
              </div>
              <div className="gg-note">ابدأ مجاناً بفرع واحد. من غير كارت.</div>
            </div>
          </section>
        </div>

        <section className="gg-sec" id="how">
          <div className="gg-w">
            <p className="gg-eyebrow">كيف يشتغل</p>
            <h2 className="gg-h2 gg-serif">
              أربع خطوات، من الحجز لحد الإرجاع.
            </h2>
            <div className="gg-steps">
              {STEPS.map((s) => (
                <div className="gg-step" key={s.n}>
                  <b className="gg-serif">{s.n}</b>
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="gg-sec" id="features" style={{ paddingTop: 0 }}>
          <div className="gg-w">
            <h2 className="gg-h2 gg-serif">كل اللي بتحتاجه، ومفيش غيره.</h2>
            <p className="gg-sub">{c.features.lead}</p>
            <div className="gg-cards">
              <div className="gg-card">
                <h3 className="gg-serif">الحجوزات في مكان واحد</h3>
                <p>كل حجز بكوده وعربونه ومتبقيه.</p>
                <div className="vis">
                  <div className="gg-shot">
                    {/* biome-ignore lint/performance/noImgElement: static review asset */}
                    <img alt="شاشة الحجوزات" src="/preview/reservations.jpg" />
                  </div>
                  <span className="gg-tag">بيانات تجريبية</span>
                </div>
              </div>
              <div className="gg-card o">
                <h3 className="gg-serif">مخزون الفساتين</h3>
                <p>كل فستان بحالته وسعره وعدد مرات تأجيره.</p>
                <div className="vis">
                  <div className="gg-shot">
                    {/* biome-ignore lint/performance/noImgElement: static review asset */}
                    <img alt="شاشة الفساتين" src="/preview/dresses.jpg" />
                  </div>
                  <span className="gg-tag">بيانات تجريبية</span>
                </div>
              </div>
              <div className="gg-card d">
                <h3 className="gg-serif">العروسة تعرف كل حاجة</h3>
                <p>رسالة واتساب أول ما الحجز يتسجل.</p>
                <div className="vis">
                  <div className="gg-phone">
                    <div className="gg-phone-in">
                      <div className="gg-phone-top">أتيليه الزمالك</div>
                      <div className="gg-bub">{MESSAGE}</div>
                    </div>
                  </div>
                  <span className="gg-tag">
                    نص البرنامج الفعلي، بيانات تجريبية
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gg-sec gg-stats">
          <div className="gg-w">
            <h2 className="gg-h2 gg-serif">أرقام تقدر تتأكد منها.</h2>
            <div className="grid">
              <div>
                <div className="gg-num">
                  ٥٠٠<sup>ج.م</sup>
                </div>
                <p>للفرع في الشهر. حوالي ١٠ دولار.</p>
              </div>
              <div>
                <div className="gg-num">
                  ٣٠<sup>فستان</sup>
                </div>
                <p>مجاناً في أول فرع، من غير كارت.</p>
              </div>
              <div>
                <div className="gg-num">
                  ٧٠٪<sup>+</sup>
                </div>
                <p>
                  وقت إداري أقل، بتقدير آلاء القصري نفسها بعد ما استبدلت الورق
                  بالنظام.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="gg-sec">
          <div className="gg-w">
            <p className="gg-eyebrow">شغّال فعلاً في أتيليه</p>
            <h2 className="gg-h2 gg-serif">
              أتيليه آلاء القصري، فرعين: قويسنا وشبين الكوم.
            </h2>
            <div className="gg-story">
              <div className="txt">
                <blockquote className="gg-serif">
                  استبدلت الورق والمتابعة بالتليفون بالنظام، وقدّرت إن الوقت
                  الإداري قلّ حوالي ٧٠٪.
                </blockquote>
                <p style={{ color: "#d3c8bb", marginTop: 16 }}>
                  آلاء القصري، صاحبة الأتيليه
                </p>
                <p className="gg-note" style={{ marginTop: 8 }}>
                  الرقم تقدير آلاء نفسها، مش قياس مستقل. نص الاقتباس صياغة
                  لتقديرها وهنراجعه معاها قبل النشر.
                </p>
              </div>
              <div className="pic">
                <div className="gg-label">
                  صورة مؤقتة. صورة حقيقية لآلاء أو للأتيليه بإذنها.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="gg-sec" id="pricing" style={{ paddingTop: 0 }}>
          <div className="gg-w">
            <h2 className="gg-h2 gg-serif">{c.pricing.title}</h2>
            <p className="gg-sub">{c.pricing.lead}</p>
            <div className="gg-price">
              <div>
                <h3
                  className="gg-serif"
                  style={{ margin: 0, fontSize: "1.5rem" }}
                >
                  {c.pricing.freeName}
                </h3>
                <b>{c.pricing.freePrice}</b>
                <ul>
                  {c.pricing.freeItems.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="d">
                <h3
                  className="gg-serif"
                  style={{ margin: 0, fontSize: "1.5rem" }}
                >
                  {c.pricing.paidName}
                </h3>
                <b>
                  {c.pricing.paidPrice}{" "}
                  <small style={{ fontSize: "1rem" }}>
                    {c.pricing.paidPer}
                  </small>
                </b>
                <span style={{ opacity: 0.7, fontSize: ".9rem" }}>
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

        <section className="gg-close" id="start">
          <div className="gg-w">
            <h2 className="gg-serif">كفاية دفاتر. خلّي الأتيليه يشتغل لوحده.</h2>
            <div className="gg-form-box">
              <h3
                className="gg-serif"
                style={{ margin: "0 0 6px", fontSize: "1.5rem" }}
              >
                {c.form.title}
              </h3>
              <p style={{ margin: "0 0 20px", color: "var(--mut)" }}>
                {c.form.lead}
              </p>
              <LeadForm
                copy={c.form}
                locale="ar"
                whatsappNumber={env.SALES_WHATSAPP_NUMBER}
              />
            </div>
          </div>
        </section>

        <section className="gg-faq" id="faq">
          <div className="gg-w">
            <h2 className="gg-h2 gg-serif" style={{ marginBottom: 20 }}>
              {c.faq.title}
            </h2>
            {c.faq.items.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="gg-foot">
        <div className="gg-w">{c.footer.line}</div>
      </footer>
    </div>
  );
}
