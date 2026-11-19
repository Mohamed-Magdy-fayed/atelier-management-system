"use client";

import { useState } from "react";

/** Interactive booking demo. Idea source: Cal.com (live scheduler widget as the proof). Demo data only. */
const BOOKED: Record<number, string> = {
  6: "عروسة سلمى",
  7: "عروسة سلمى",
  13: "عروسة منى",
  20: "خطوبة رنا",
  21: "خطوبة رنا",
  27: "عروسة هبة",
};

export function BookingDemo() {
  const [day, setDay] = useState<number | null>(14);
  const names = ["س", "ح", "ن", "ث", "ر", "خ", "ج"];
  const cells = Array.from({ length: 30 }, (_, i) => i + 1);
  const taken = day ? BOOKED[day] : null;
  return (
    <div className="gg-demo">
      <div className="gg-demo-cal" dir="rtl">
        <div className="gg-demo-head">
          <b>فستان ZML-D-001</b>
          <span>نوفمبر ٢٠٢٦</span>
        </div>
        <div className="gg-demo-grid">
          {names.map((n) => (
            <i key={n}>{n}</i>
          ))}
          {cells.map((d) => (
            <button
              className={`${BOOKED[d] ? "bk" : ""} ${day === d ? "on" : ""}`}
              key={d}
              onClick={() => setDay(d)}
              type="button"
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="gg-demo-side">
        {taken ? (
          <>
            <div className="gg-demo-badge no">محجوز</div>
            <p className="gg-demo-t">
              يوم {day} نوفمبر محجوز لـ{taken}.
            </p>
            <p>
              مش هيتقبل حجز تاني على نفس الفستان في اليوم ده. البرنامج بيمنعه من
              غير ما حد يفتكر.
            </p>
          </>
        ) : (
          <>
            <div className="gg-demo-badge ok">متاح</div>
            <p className="gg-demo-t">يوم {day ?? "…"} نوفمبر فاضي.</p>
            <p>
              اضغطي احجزي، والعربون والمتبقي بيتحسبوا، وتتبعت رسالة تأكيد
              للعروسة.
            </p>
          </>
        )}
        <span className="gg-tag">بيانات تجريبية. جرّب تضغط على أي يوم.</span>
      </div>
    </div>
  );
}
