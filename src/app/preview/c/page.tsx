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

/**
 * The wording is the real confirmation message the app sends
 * (`whatsappReservation*` keys in i18n/ar.ts), filled with demo data.
 */
const MESSAGE = [
  "أهلاً سلمى،",
  "",
  "تم تأكيد حجزك في أتيليه الزمالك. رقم الحجز: RES-ZML-20261117-019",
  "",
  "الفستان: Ivory Lace Cathedral Wedding Gown (ZML-D-001)",
  "الاستلام: ٢٥ نوفمبر ٢٠٢٦، ٦:٠٠ م",
  "المناسبة: ٢٧ نوفمبر ٢٠٢٦",
  "الإرجاع: ٢٩ نوفمبر ٢٠٢٦، ٦:٠٠ م",
  "",
  "الإجمالي: ٢٬١٠٠ ج.م.",
  "المدفوع: ٧٥٠ ج.م.",
  "المتبقي: ١٬٣٥٠ ج.م.",
].join("\n");

/** Direction C: start from the WhatsApp message (Foodics-style real device, Daftra directness). */
export default function PreviewC() {
  guardPreview();
  return (
    <PreviewFrame current="c">
      <Header />
      <main>
        <section className="pv-wrap pv-split">
          <div>
            <h1 className="pv-h1">الحجز يوصل للعروسة على واتساب، لوحده.</h1>
            <p className="pv-lead">
              أول ما الموظفة تسجّل الحجز، العروسة تستلم رسالة بالفستان والاستلام
              والإرجاع والمتبقي. من غير مكالمات، ومن غير ما حد ينسى.
            </p>
            <div className="pv-row">
              <a className="pv-btn" href="#start">
                {c.hero.primary}
              </a>
              <a className="pv-btn pv-btn-line" href="#start">
                {c.hero.whatsapp}
              </a>
            </div>
            <Trust />
          </div>
          <div>
            <div className="pv-phone">
              <div className="pv-phone-in">
                <div className="pv-phone-top">أتيليه الزمالك</div>
                <div className="pv-chat">
                  <div className="pv-bub">
                    {MESSAGE}
                    <span className="pv-time">٢:١٤ م</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="pv-cap" style={{ textAlign: "center" }}>
              <span className="pv-tag">بيانات تجريبية</span> نص الرسالة هو نص
              البرنامج الفعلي. الاسم والأرقام وهمية.
            </p>
          </div>
        </section>
        <Sections />
      </main>
    </PreviewFrame>
  );
}
