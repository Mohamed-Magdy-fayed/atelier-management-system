import type { PseoRow } from "./types";

/**
 * Counts come from the Gateling sales tracker (our own research list of dress
 * shops found on Google Maps and Instagram, snapshot 2026-11-18, 105 rows). They
 * are NOT a census and include shops that only sell. Pages state that plainly.
 * Individual shops are never named or linked.
 */
const SOURCE =
  "قائمة بحث Gateling الداخلية (خرائط جوجل وإنستجرام)، حتى نوفمبر ٢٠٢٦";

function a(
  slug: string,
  h1Area: string,
  count: string,
  nearby: string,
  related: string[],
): PseoRow {
  return {
    family: "barnamag-atelier",
    slug,
    h1: `برنامج إدارة أتيليه فساتين في ${h1Area}`,
    title: `برنامج إدارة أتيليه فساتين في ${h1Area} | Gateling Atelier`,
    description: `برنامج لأتيليهات تأجير الفساتين في ${h1Area}: حجوزات وعربون ومرتجعات من الموبايل. ٥٠٠ جنيه للفرع في الشهر.`,
    intro: `لو عندك أتيليه فساتين زفاف أو سواريه في ${h1Area}، فالمشاكل اللي بتقابلك هي نفسها: حجز مرتين، عربون ضايع، فستان متأخر. ده اللي صُمّم البرنامج لحلّه.`,
    sections: [
      {
        h2: `أتيليهات الفساتين في ${h1Area}`,
        paragraphs: [
          `في بحثنا عن محلات الفساتين في ${h1Area} لقينا ${count} محل زفاف وسواريه. الرقم ده من قايمة بحثنا مش إحصاء رسمي، وبيشمل محلات بتبيع بس.`,
          `المناطق القريبة: ${nearby}.`,
        ],
      },
      {
        h2: "إيه اللي بيحتاجه الأتيليه عندك",
        paragraphs: [
          "تقويم لكل فستان بيمنع الحجز المزدوج، تسجيل العربون والدفعات، وإيصالات جاهزة، ومتابعة المرتجعات، وكل الفروع من الموبايل.",
          "السعر ٥٠٠ جنيه للفرع في الشهر (حوالي ١٠ دولار)، وفي نسخة مجانية لفرع واحد. التجهيز والتدريب من غير مقابل.",
        ],
      },
    ],
    dataPoints: [
      {
        label: `محلات فساتين في قايمتنا (${h1Area})`,
        value: count,
        source: SOURCE,
      },
    ],
    faq: [
      {
        q: `هل البرنامج متاح لأتيليه في ${h1Area}؟`,
        a: "أيوه، البرنامج على الإنترنت ومش محتاج تركيب. بنجهّز الأتيليه ونعلّم الموظفين.",
      },
    ],
    related: related.map((s) => ({ family: "hulul" as const, slug: s })),
    published: false,
    updatedAt: "2026-11-18",
  };
}

export const AREAS: PseoRow[] = [
  a(
    "cairo",
    "القاهرة",
    "٥٩",
    "مدينة نصر، مصر الجديدة، التجمع، المعادي، المقطم، حلوان",
    ["prevent-double-booking", "multi-branch-inventory"],
  ),
  a(
    "alexandria",
    "الإسكندرية",
    "٢١",
    "رشدي، سان ستيفانو، الإبراهيمية، لوران، فيكتوريا، الشاطبي",
    ["prevent-double-booking", "track-deposits"],
  ),
  a("giza", "الجيزة", "١١", "المهندسين، إمبابة، حدائق الأهرام، ٦ أكتوبر", [
    "prevent-double-booking",
    "check-availability-by-date",
  ]),
  a(
    "nasr-city",
    "مدينة نصر",
    "٢٤",
    "الجولف، عباس العقاد، الحي السادس، النادي الأهلي، مصر الجديدة",
    ["track-deposits", "late-dress-return"],
  ),
  a("heliopolis", "مصر الجديدة", "٩", "الماظة، النزهة، الكوربة، الجولف", [
    "prevent-double-booking",
    "receipts-prevent-disputes",
  ]),
];
