import type { PseoRow } from "./types";

/**
 * Pages that target the head searches of the niche (برنامج اتيليه, برنامج
 * تأجير فساتين, برنامج حجز فساتين زفاف, atelier / dress rental software) and
 * the comparison searches. DRAFTS until Megz reviews the copy.
 *
 * Product claims stay inside what the system does: per-dress calendar that
 * rejects overlapping reservations, deposits and payments, printable receipts,
 * reservation statuses, availability by date, branches, staff permissions.
 * Competitor claims come only from the competitor's own public page and are
 * phrased as "according to their page", never as a verdict.
 */

const PRICE_NOTE =
  "٥٠٠ جنيه للفرع في الشهر (حوالي ١٠ دولار)، وفي نسخة مجانية لفرع واحد.";

const UPDATED = "2026-11-19";

export const KEYWORD_PAGES: PseoRow[] = [
  {
    family: "barnamag",
    slug: "atelier",
    h1: "برنامج اتيليه: إدارة الحجوزات والعربون والمرتجعات",
    title:
      "برنامج اتيليه فساتين زفاف وسواريه: حجوزات وعربون ومرتجعات | Gateling Atelier",
    description:
      "برنامج إدارة اتيليه لتأجير الفساتين في مصر: تقويم لكل فستان يمنع الحجز المزدوج، عربون وإيصالات، مرتجعات، وكل الفروع من الموبايل.",
    intro:
      "برنامج الاتيليه الكويس بيجاوب على أسئلة اليوم كله: الفستان ده متاح يوم الفرح؟ العروسة دفعت كام وفاضل كام؟ الفستان اللي مفروض يرجع النهارده رجع ولا لأ؟ لو الإجابات دي في دفتر أو واتساب أو دماغ حد، البرنامج هو الحل.",
    sections: [
      {
        h2: "إيه اللي بيعمله برنامج اتيليه الفساتين",
        paragraphs: [
          "Gateling Atelier مصنوع لأتيليهات تأجير فساتين الزفاف والسواريه بالذات، مش برنامج محلات عام.",
        ],
        steps: [
          {
            title: "تقويم لكل فستان",
            body: "كل فستان له تقويم حجوزات. لو حد حاول يحجز نفس الفستان على أيام متداخلة، البرنامج بيرفض الحجز.",
          },
          {
            title: "العربون والدفعات",
            body: "بتسجّل العربون والدفعات لكل حجز، ويبان المدفوع والباقي فوراً، مع إيصال تقدر تطبعه.",
          },
          {
            title: "حالة الحجز",
            body: "كل حجز له حالة: محجوز، اتسلّم، رجع، أو ملغي. تعرف إيه اللي لازم يرجع النهارده من غير ما تدوّر.",
          },
          {
            title: "الفروع والموظفين",
            body: "لو عندك أكتر من فرع، كل الفروع على نفس النظام. وتحدد كل موظف يشوف ويعدّل إيه.",
          },
          {
            title: "من الموبايل",
            body: "البرنامج على الإنترنت ومش محتاج تركيب. بتفتحه من الموبايل أو الكمبيوتر.",
          },
        ],
      },
      {
        h2: "لمين برنامج الاتيليه ده",
        paragraphs: [
          "لأتيليه بيأجّر فساتين زفاف أو سواريه، فرع واحد أو أكتر، وشغّال بدفتر أو إكسل أو واتساب. لو شغلك بيع وتفصيل بس من غير تأجير، البرنامج مش مصمم ليك.",
          PRICE_NOTE,
        ],
      },
    ],
    comparison: [
      {
        aspect: "منع الحجز المزدوج",
        manual: "بتفتكر أو بتراجع الدفتر، وممكن يفوتك حجز من فرع تاني.",
        system: "تقويم الفستان بيرفض أي حجز بيتداخل مع حجز موجود.",
      },
      {
        aspect: "العربون والباقي",
        manual: "بتحسب على ورقة وبتدوّر وقت الخلاف.",
        system: "المدفوع والباقي ظاهرين على الحجز، وفي إيصال جاهز.",
      },
      {
        aspect: "مرتجعات اليوم",
        manual: "لازم تعدّي على الدفتر كله.",
        system: "تفلتر بحالة الحجز وتشوف اللي لسه ما رجعش.",
      },
    ],
    faq: [
      {
        q: "ما هو أفضل برنامج اتيليه لتأجير الفساتين؟",
        a: "الأفضل هو اللي مصنوع لتأجير الفساتين: تقويم لكل فستان، عربون ودفعات، ومرتجعات. جرّب أي برنامج على فساتينك الحقيقية قبل ما تدفع، وده بالظبط اللي بنوفّره في النسخة المجانية.",
      },
      {
        q: "كام سعر برنامج الاتيليه؟",
        a: PRICE_NOTE,
      },
      {
        q: "هل محتاج أركّب حاجة؟",
        a: "لأ. البرنامج على الإنترنت، وبنجهّز الاتيليه ونعلّم الموظفين.",
      },
    ],
    related: [
      { family: "barnamag", slug: "dress-rental-program" },
      { family: "barnamag", slug: "wedding-dress-booking-program" },
      { family: "hulul", slug: "prevent-double-booking" },
      { family: "hulul", slug: "move-notebook-to-software" },
    ],
    published: false,
    updatedAt: UPDATED,
  },
  {
    family: "barnamag",
    slug: "dress-rental-program",
    h1: "برنامج تأجير فساتين: تابع كل فستان وكل حجز",
    title: "برنامج تأجير فساتين زفاف وسواريه في مصر | Gateling Atelier",
    description:
      "برنامج تأجير فساتين: مين حجز إيه وفي أنهي أيام، العربون والباقي، ومواعيد الرجوع. من غير دفاتر ومن غير حجز مرتين.",
    intro:
      "تأجير الفستان مش زي البيع: نفس الفستان بيتحجز لأيام معينة وبيرجع ويتأجّر تاني. عشان كده البرنامج لازم يفهم التواريخ، مش بس يسجّل فواتير.",
    sections: [
      {
        h2: "إيه المختلف في برنامج تأجير الفساتين",
        paragraphs: [
          "برنامج المبيعات العادي بيسجّل عملية بيع وخلاص. برنامج التأجير لازم يعرف إن الفستان بره من تاريخ كذا لتاريخ كذا، ومينفعش يتحجز في النص.",
        ],
        steps: [
          {
            title: "الفستان له تاريخ استلام ورجوع",
            body: "الحجز بيتسجّل بفترة، والبرنامج بيمنع أي حجز تاني بيتقاطع معاها.",
          },
          {
            title: "تعرف المتاح يوم فرح العروسة",
            body: "تكتب التاريخ وتشوف الفساتين الفاضية، وإنتي قدام العروسة.",
          },
          {
            title: "المدفوع والباقي والتأمين",
            body: "كل دفعة متسجّلة على الحجز، ويبان الباقي، ومعاه إيصال تقدر تطبعه.",
          },
          {
            title: "متابعة الرجوع",
            body: "تشوف إيه اللي مفروض يرجع النهارده وإيه اللي اتأخر.",
          },
        ],
      },
      {
        h2: "ينفع للتأجير والبيع مع بعض؟",
        paragraphs: [
          "البرنامج متصمم حوالين التأجير. لو الاتيليه بتاعك بيأجّر ويبيع، التأجير هو اللي هيشتغل معاك كويس.",
          PRICE_NOTE,
        ],
      },
    ],
    comparison: [
      {
        aspect: "حجز نفس الفستان",
        manual: "ممكن يتحجز مرتين لو الحجز اتسجل في مكانين.",
        system: "البرنامج بيرفض الحجز المتداخل.",
      },
      {
        aspect: "السؤال عن تاريخ معين",
        manual: "بتقلّبي في الدفتر والعروسة مستنية.",
        system: "بتشوفي المتاح في تاريخ الفرح بسرعة.",
      },
    ],
    faq: [
      {
        q: "إيه الفرق بين برنامج تأجير فساتين وبرنامج محاسبة عادي؟",
        a: "برنامج المحاسبة بيسجّل الفلوس. برنامج التأجير بيفهم إن الفستان محجوز لفترة، وبيمنع التعارض، وبيتابع الرجوع.",
      },
      {
        q: "هل ينفع أجرّب قبل ما أدفع؟",
        a: "أيوه، في نسخة مجانية لفرع واحد وبنجهّز الاتيليه ونعلّم الموظفين.",
      },
    ],
    related: [
      { family: "barnamag", slug: "atelier" },
      { family: "hulul", slug: "check-availability-by-date" },
      { family: "hulul", slug: "late-dress-return" },
      { family: "hulul", slug: "track-deposits" },
    ],
    published: false,
    updatedAt: UPDATED,
  },
  {
    family: "barnamag",
    slug: "wedding-dress-booking-program",
    h1: "برنامج حجز فساتين زفاف: من أول العربون لحد الرجوع",
    title: "برنامج حجز فساتين زفاف: عربون وحجوزات من غير تعارض | Gateling Atelier",
    description:
      "برنامج حجز فساتين زفاف للاتيليهات: سجّل الحجز والعربون، امنع الحجز المزدوج، وتابع ميعاد الاستلام والرجوع.",
    intro:
      "الحجز هو قلب شغل الاتيليه. العروسة بتحجز قبل الفرح بشهور، وبتدفع على دفعات، وبتستلم قبل الفرح بأيام. أي غلط في الحجز بيبقى غلط في فرح.",
    sections: [
      {
        h2: "رحلة الحجز في البرنامج",
        steps: [
          {
            title: "العروسة تختار الفستان والتاريخ",
            body: "تدخل التاريخ، تشوف الفساتين المتاحة، وتختار.",
          },
          {
            title: "تسجّل الحجز والعربون",
            body: "الحجز بيتسجّل على الفستان والتاريخ، والعربون بيتسجّل عليه ويطلع إيصال.",
          },
          {
            title: "الاستلام",
            body: "وقت الاستلام تغيّر حالة الحجز، وتسجّل الباقي لو في.",
          },
          {
            title: "الرجوع",
            body: "لما الفستان يرجع تقفل الحجز، وتسجّل رد التأمين لو في.",
          },
        ],
      },
      {
        h2: "إزاي بنمنع الحجز المزدوج",
        paragraphs: [
          "كل فستان له تقويم. لو حجز جديد بيتقاطع مع حجز موجود على نفس الفستان، البرنامج بيرفضه. ده شغّال بين الفروع كمان لأنها على نفس النظام.",
          PRICE_NOTE,
        ],
      },
    ],
    faq: [
      {
        q: "إزاي أحجز فستان لعروسة وأتأكد إنه فاضي؟",
        a: "بتدخل تاريخ الفرح في البرنامج وتشوف الفساتين المتاحة، وأي حجز بيتداخل بيترفض تلقائياً.",
      },
      {
        q: "العربون بيتسجل إزاي؟",
        a: "كل دفعة بتتسجّل على الحجز، والباقي بيبان، وفي إيصال تقدر تطبعه.",
      },
    ],
    related: [
      { family: "barnamag", slug: "atelier" },
      { family: "hulul", slug: "prevent-double-booking" },
      { family: "namazig", slug: "deposit-receipt" },
    ],
    published: false,
    updatedAt: UPDATED,
  },
  {
    family: "barnamag",
    slug: "atelier-accounting-program",
    h1: "برنامج حسابات اتيليه: المدفوع والباقي لكل حجز",
    title: "برنامج حسابات اتيليه فساتين: عربون ودفعات وإيصالات | Gateling Atelier",
    description:
      "تابع عربون ودفعات وباقي كل حجز فستان، مع إيصالات جاهزة. للاتيليهات اللي بتحاسب على الورق.",
    intro:
      "أهم حسابات الاتيليه هي حسابات الحجز: دفعت كام، فاضل كام، والتأمين اتردّ ولا لأ. البرنامج بيجمّع ده كله على الحجز نفسه.",
    sections: [
      {
        h2: "اللي بيغطيه البرنامج وإللي لأ",
        paragraphs: [
          "بيسجّل العربون والدفعات والباقي لكل حجز، ويطلّع إيصال تقدر تطبعه.",
          "ده مش بديل لبرنامج محاسبة كامل بالضرايب والميزانيات. لو محاسبك محتاج ده، استخدم برنامجه جنب Gateling Atelier.",
        ],
      },
    ],
    faq: [
      {
        q: "هل البرنامج بيطلّع إيصالات؟",
        a: "أيوه، إيصال بالمدفوع والباقي تقدر تطبعه.",
      },
      {
        q: "هل ده برنامج محاسبة كامل؟",
        a: "لأ. هو بيتابع حسابات الحجوزات. لو محتاج ضرايب وميزانيات استخدم برنامج محاسبة جنبه.",
      },
    ],
    related: [
      { family: "hulul", slug: "track-deposits" },
      { family: "hulul", slug: "monthly-profit" },
      { family: "namazig", slug: "deposit-receipt" },
    ],
    published: false,
    updatedAt: UPDATED,
  },
  {
    family: "barnamag",
    slug: "vs-dexef",
    h1: "Gateling Atelier مقابل DEXEF لتأجير فساتين الزفاف",
    title: "مقارنة Gateling Atelier وDEXEF لإدارة تأجير فساتين الزفاف",
    description:
      "مقارنة هادية بين Gateling Atelier وبرنامج DEXEF لتأجير فساتين الزفاف: النوع، التركيز، وإزاي تختار.",
    intro:
      "DEXEF برنامج موجود وعنده صفحة مخصصة لتأجير فساتين الزفاف. دي مقارنة مبنية على اللي منشور في صفحتهم العامة، مش على تجربة داخل برنامجهم. اتأكد منهم مباشرة قبل ما تقرر.",
    sections: [
      {
        h2: "الفرق في التركيز",
        paragraphs: [
          "حسب صفحة DEXEF، البرنامج بتاعهم يشمل نقطة بيع ومحاسبة وإمكانية أكتر من مخزن، ويذكروا محاسبة تكاليف ومراحل تصنيع. ده شكل نظام إدارة متكامل.",
          "Gateling Atelier أضيق وأبسط: متصمم لتأجير الفساتين بس، فيه تقويم لكل فستان يرفض الحجز المتداخل، عربون ودفعات وإيصالات، ومرتجعات.",
        ],
      },
      {
        h2: "تختار مين؟",
        paragraphs: [
          "لو عايز نظام محاسبة ومخازن وتصنيع شامل، اطلب عرض من DEXEF وقارن.",
          "لو مشكلتك الأساسية الحجوزات والعربون والمرتجعات، وعايز تبدأ بسرعة من الموبايل، جرّب Gateling Atelier. " +
            PRICE_NOTE,
        ],
      },
    ],
    comparison: [
      {
        aspect: "النوع",
        manual: "نظام إدارة أوسع (نقطة بيع ومحاسبة ومخازن حسب صفحتهم).",
        system: "برنامج مخصص لتأجير الفساتين.",
      },
      {
        aspect: "الحجز المتداخل",
        manual: "اسألهم مباشرة: هل بيرفض الحجز المتداخل على نفس الفستان؟",
        system: "أيوه، التقويم بيرفضه.",
      },
      {
        aspect: "السعر",
        manual: "اطلب عرض سعر منهم.",
        system: "٥٠٠ جنيه للفرع في الشهر، ونسخة مجانية لفرع واحد.",
      },
    ],
    comparisonCols: { heading: "المقارنة", left: "DEXEF", right: "Gateling Atelier" },
    faq: [
      {
        q: "هل Gateling Atelier أحسن من DEXEF؟",
        a: "مش أحسن في المطلق. لو محتاج محاسبة ومخازن وتصنيع شامل فـ DEXEF أقرب. لو محتاج حجوزات وعربون ومرتجعات من غير تعقيد فـ Gateling Atelier أبسط.",
      },
    ],
    related: [
      { family: "barnamag", slug: "atelier" },
      { family: "barnamag", slug: "dress-rental-program" },
      { family: "hulul", slug: "move-notebook-to-software" },
    ],
    published: false,
    updatedAt: UPDATED,
  },
  {
    family: "software",
    slug: "dress-rental-software",
    h1: "Dress rental software for atelier owners in Egypt",
    title: "Dress Rental Software & Atelier Management | Gateling Atelier",
    description:
      "Atelier management software for bridal and soirée dress rental: a calendar per dress that rejects overlapping bookings, deposits, receipts and returns. 500 EGP per branch per month.",
    intro:
      "Renting a dress is different from selling one: the same gown is booked for specific dates, goes out, comes back and is rented again. Gateling Atelier is built around that cycle, for ateliers in Egypt.",
    sections: [
      {
        h2: "What the software does",
        steps: [
          {
            title: "A calendar for every dress",
            body: "Each dress has its own booking calendar. A booking that overlaps an existing one is rejected.",
          },
          {
            title: "Deposits and payments",
            body: "Record the deposit and each payment on the booking. Paid and remaining amounts are always visible, with a printable receipt.",
          },
          {
            title: "Statuses and returns",
            body: "Reserved, picked up, returned, cancelled. See what is due back today at a glance.",
          },
          {
            title: "Branches and staff",
            body: "Every branch on one system, and permissions per staff member.",
          },
        ],
      },
      {
        h2: "Pricing",
        paragraphs: [
          "500 EGP per branch per month (about 10 USD). There is a free plan for a single branch. We set up the atelier and train the staff.",
          "Gateling Atelier is not a full accounting package. If you need tax and balance sheets, run accounting software alongside it.",
        ],
      },
    ],
    comparison: [
      {
        aspect: "Double bookings",
        manual: "Depends on someone remembering to check the notebook.",
        system: "Rejected automatically by the dress calendar.",
      },
      {
        aspect: "Deposit balance",
        manual: "Worked out on paper, argued over later.",
        system: "Paid and remaining shown on the booking.",
      },
    ],
    comparisonCols: { heading: "By hand vs software", left: "By hand", right: "With the software" },
    faq: [
      {
        q: "Is there dress rental software in Arabic?",
        a: "Yes. Gateling Atelier is Arabic first, with an English interface option, built for Egyptian ateliers.",
      },
      {
        q: "Do I need to install anything?",
        a: "No. It runs online, on a phone or a computer.",
      },
      {
        q: "Can I try it first?",
        a: "Yes. There is a free plan for one branch.",
      },
    ],
    related: [],
    published: false,
    updatedAt: UPDATED,
  },
];
