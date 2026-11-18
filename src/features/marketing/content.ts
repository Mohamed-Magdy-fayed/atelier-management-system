/**
 * Copy for the Gateling Atelier marketing page (`/`, `/en`).
 *
 * Rules for editing this file:
 * - Arabic is written first, in Egyptian-leaning plain language an atelier owner
 *   speaks. The English mirrors the meaning, not the words.
 * - Only real numbers. The 70% figure is Aalaa El Kasry's own claim and is shown
 *   with its source. No invented reviews, counts or urgency.
 * - Prices are the planned list price. Keep PRICE_EGP in sync with the pricing
 *   section and the SoftwareApplication JSON-LD.
 */

export type MarketingLocale = "ar" | "en";

export const PRICE_EGP = 500;
export const PRICE_USD_APPROX = 10;

/** Free-tier limits (decision D3, approved). */
export const FREE_TIER = { branches: 1, dresses: 30, reservationsPerMonth: 20 };

type Faq = { q: string; a: string };

export type MarketingCopy = {
  meta: { title: string; description: string };
  nav: { features: string; pricing: string; faq: string; cta: string };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primary: string;
    whatsapp: string;
    note: string;
  };
  calendar: {
    caption: string;
    dressLabel: string;
    clash: string;
    fixed: string;
    legendA: string;
    legendB: string;
  };
  pains: { title: string; items: { title: string; body: string }[] };
  features: {
    title: string;
    lead: string;
    items: { title: string; body: string }[];
  };
  proof: {
    title: string;
    stat: string;
    statLabel: string;
    detail: string;
    link: string;
  };
  pricing: {
    title: string;
    lead: string;
    paidName: string;
    paidPrice: string;
    paidPer: string;
    paidApprox: string;
    paidItems: string[];
    freeName: string;
    freePrice: string;
    freeItems: string[];
    discounts: string;
    cta: string;
  };
  form: {
    title: string;
    lead: string;
    name: string;
    phone: string;
    atelier: string;
    city: string;
    branches: string;
    type: string;
    types: { bridal: string; soiree: string; both: string };
    submit: string;
    sentHint: string;
    missing: string;
  };
  faq: { title: string; items: Faq[] };
  footer: { line: string; other: string; otherHref: string };
};

export const COPY: Record<MarketingLocale, MarketingCopy> = {
  ar: {
    meta: {
      title: "برنامج إدارة أتيليه فساتين الزفاف والسواريه | Gateling Atelier",
      description:
        "حجوزات، عربون، مرتجعات، وكل فروعك من الموبايل. برنامج مصنوع لأتيليهات تأجير الفساتين في مصر: مفيش فستان يتحجز مرتين. ٥٠٠ جنيه للفرع في الشهر.",
    },
    nav: {
      features: "المميزات",
      pricing: "الأسعار",
      faq: "أسئلة",
      cta: "اطلب تجربة مجانية",
    },
    hero: {
      eyebrow: "برنامج لأتيليهات تأجير الفساتين",
      title: "مفيش فستان يتحجز مرتين.",
      lead: "الحجوزات والعربون والمرتجعات وكل فروعك على موبايلك، بدل الدفتر والمكالمات. اتعمل مع أتيليه شغال، مش في مكتب.",
      primary: "اطلب تجربة مجانية",
      whatsapp: "اسأل على واتساب",
      note: "بنجهّز الأتيليه بتاعك ونعلّم موظفينك من غير مقابل.",
    },
    calendar: {
      caption: "نفس الفستان، نفس الأسبوع. تقدر تشوف المشكلة قبل ما تحصل.",
      dressLabel: "فستان زفاف · كود ١٤",
      clash: "تعارض: عروستين على نفس اليوم",
      fixed: "البرنامج يمنع الحجز التاني ويعرض أقرب يوم متاح",
      legendA: "عروس ١",
      legendB: "عروس ٢",
    },
    pains: {
      title: "اللي بيحصل في الأتيليه من غير نظام",
      items: [
        {
          title: "الفستان اتحجز مرتين",
          body: "حجز على التليفون وحجز في الفرع التاني، ويوم الفرح عروستين على نفس الفستان.",
        },
        {
          title: "العربون ضايع في الدفتر",
          body: "مين دفع كام، وفاضل كام، ومين لسه ماسلمش. كل ده في ورق أو في دماغ حد.",
        },
        {
          title: "مش عارفة الفستان رجع ولا لأ",
          body: "الفستان المفروض يرجع النهارده. مفيش حد متأكد، ولا حد بيفكّر العروس.",
        },
      ],
    },
    features: {
      title: "كل اللي بتحتاجه، ومفيش غيره",
      lead: "اتصمم حوالين شغل التأجير بالذات: الفستان بيتأجر لأيام، مش بيتباع.",
      items: [
        {
          title: "تقويم الحجز بالفستان",
          body: "كل فستان له تقويمه. أي يوم محجوز يظهر فوراً، ومينفعش يتحجز تاني.",
        },
        {
          title: "العربون والباقي",
          body: "سجّل العربون وكل دفعة بعدها. الإيصال يطلع جاهز للطباعة.",
        },
        {
          title: "المرتجعات",
          body: "اعرف مين لازم يرجّع النهارده ووسجّل الاسترجاع بضغطة.",
        },
        {
          title: "كل الفروع في مكان واحد",
          body: "المخزون والحجوزات لكل فرع، وإنتي شايفة الكل من موبايلك.",
        },
        {
          title: "الإتاحة بالتاريخ",
          body: "اختاري يوم الفرح واعرفي الفساتين المتاحة في أي فرع في ثواني.",
        },
        {
          title: "صلاحيات الموظفين",
          body: "كل موظف يشوف اللي يخصه بس. إنتي اللي بتقرري.",
        },
      ],
    },
    proof: {
      title: "شغّال فعلاً في أتيليه",
      stat: "حوالي ٧٠٪",
      statLabel: "وقت إداري أقل",
      detail:
        "الرقم تقدير آلاء القصري نفسها بعد ما استبدلت الورق والمتابعة بالتليفون بالنظام. فرعين: قويسنا وشبين الكوم.",
      link: "اقرأي دراسة الحالة",
    },
    pricing: {
      title: "سعر بسيط. من غير مفاجآت.",
      lead: "ابدأ مجاناً بفرع واحد. وفي أي وقت زوّد فرع بنفس السعر.",
      paidName: "الأتيليه",
      paidPrice: "٥٠٠ جنيه",
      paidPer: "للفرع في الشهر",
      paidApprox: "حوالي ١٠ دولار",
      paidItems: [
        "فساتين وحجوزات من غير حد",
        "مرتجعات وعربون وإيصالات",
        "تجهيز الأتيليه وتدريب الموظفين من غير مقابل",
        "دعم على واتساب",
      ],
      freeName: "ابدأ مجاناً",
      freePrice: "٠ جنيه",
      freeItems: ["فرع واحد", "حتى ٣٠ فستان", "حتى ٢٠ حجز في الشهر"],
      discounts: "خصم لو دفعت كذا شهر مقدماً، وخصم للأتيليهات متعددة الفروع.",
      cta: "اطلب تجربة مجانية",
    },
    form: {
      title: "ابدأ من هنا",
      lead: "سيب بياناتك ونكلمك على واتساب. بنجهّز لك الأتيليه ونوريك الشغل على فساتينك إنتي.",
      name: "اسمك",
      phone: "رقم واتساب",
      atelier: "اسم الأتيليه",
      city: "المدينة",
      branches: "عدد الفروع",
      type: "نوع الأتيليه",
      types: { bridal: "زفاف", soiree: "سواريه", both: "الاتنين" },
      submit: "ابعت على واتساب",
      sentHint: "هيتفتح واتساب برسالة جاهزة. اضغط إرسال.",
      missing: "اكتب اسمك ورقمك على الأقل.",
    },
    faq: {
      title: "أسئلة بتتسأل كتير",
      items: [
        {
          q: "هل لازم أنقل بياناتي القديمة؟",
          a: "لأ. نبدأ بالفساتين والحجوزات الجاية، ولو عندك شيت إكسل نساعدك ندخله.",
        },
        {
          q: "الموظفين مش بتوع تكنولوجيا، هيعرفوا يستخدموه؟",
          a: "الشاشات عربي وبسيطة، وبنعلّم الموظفين بنفسنا من غير مقابل في الأول.",
        },
        {
          q: "هل بيانات العملاء والحجوزات في أمان؟",
          a: "كل أتيليه ليه حسابه وبياناته منفصلة، وكل موظف بيشوف حسب صلاحيته.",
        },
        {
          q: "لو عندي أكتر من فرع؟",
          a: "كل فرع بمخزونه وحجوزاته، وإنتي بتشوفي الكل. السعر ٥٠٠ جنيه للفرع.",
        },
        {
          q: "أقدر ألغي؟",
          a: "أي وقت. مفيش عقد إجباري، وبياناتك تقدر تاخد نسخة منها.",
        },
      ],
    },
    footer: {
      line: "Gateling Atelier من Gateling Solutions",
      other: "English",
      otherHref: "/en",
    },
  },
  en: {
    meta: {
      title:
        "Dress rental atelier software (bridal & soirée) | Gateling Atelier",
      description:
        "Reservations, deposits, returns and every branch from your phone. Software built for dress-rental ateliers: no dress booked twice. 500 EGP (about $10) per branch per month.",
    },
    nav: {
      features: "Features",
      pricing: "Pricing",
      faq: "FAQ",
      cta: "Request a free trial",
    },
    hero: {
      eyebrow: "Software for dress-rental ateliers",
      title: "No dress booked twice.",
      lead: "Reservations, deposits, returns and every branch on your phone, instead of the notebook and the phone calls. Built with a working atelier, not in an office.",
      primary: "Request a free trial",
      whatsapp: "Ask on WhatsApp",
      note: "We set up your atelier and train your staff for free.",
    },
    calendar: {
      caption: "Same dress, same week. You see the problem before it happens.",
      dressLabel: "Bridal gown · code 14",
      clash: "Clash: two brides on the same day",
      fixed:
        "The system blocks the second booking and offers the nearest free day",
      legendA: "Bride 1",
      legendB: "Bride 2",
    },
    pains: {
      title: "What happens in an atelier without a system",
      items: [
        {
          title: "A dress booked twice",
          body: "One booking by phone, one at the other branch, and on the wedding day two brides want the same gown.",
        },
        {
          title: "Deposits lost in the notebook",
          body: "Who paid what, what is left, who has not collected yet. All of it on paper or in someone's head.",
        },
        {
          title: "Nobody knows if it came back",
          body: "The dress is due back today. Nobody is sure, and nobody reminds the bride.",
        },
      ],
    },
    features: {
      title: "Everything you need, nothing you do not",
      lead: "Designed around rental: a dress is hired for days, not sold.",
      items: [
        {
          title: "A booking calendar per dress",
          body: "Every dress has its own calendar. A booked day shows instantly and cannot be booked again.",
        },
        {
          title: "Deposits and balances",
          body: "Record the deposit and each payment after it. Receipts come out ready to print.",
        },
        {
          title: "Returns",
          body: "See who must return today and and mark the return in one tap.",
        },
        {
          title: "Every branch in one place",
          body: "Stock and bookings per branch, and you see all of it from your phone.",
        },
        {
          title: "Availability by date",
          body: "Pick the wedding date and see which dresses are free at any branch in seconds.",
        },
        {
          title: "Staff permissions",
          body: "Each employee sees only what concerns them. You decide.",
        },
      ],
    },
    proof: {
      title: "Already running in a real atelier",
      stat: "about 70%",
      statLabel: "less admin time",
      detail:
        "The figure is Aalaa El Kasry's own estimate after replacing paper and phone tracking with the system. Two branches: Quesna and Shibin El Kom.",
      link: "Read the case study",
    },
    pricing: {
      title: "Simple price. No surprises.",
      lead: "Start free with one branch. Add a branch any time at the same price.",
      paidName: "Atelier",
      paidPrice: "500 EGP",
      paidPer: "per branch per month",
      paidApprox: "about $10",
      paidItems: [
        "Unlimited dresses and bookings",
        "Returns, deposits and receipts",
        "Free setup and staff training",
        "Support on WhatsApp",
      ],
      freeName: "Start free",
      freePrice: "0 EGP",
      freeItems: [
        "One branch",
        "Up to 30 dresses",
        "Up to 20 bookings a month",
      ],
      discounts:
        "Discounts for paying several months ahead, and for multi-branch ateliers.",
      cta: "Request a free trial",
    },
    form: {
      title: "Start here",
      lead: "Leave your details and we message you on WhatsApp. We set up your atelier and show it working on your own dresses.",
      name: "Your name",
      phone: "WhatsApp number",
      atelier: "Atelier name",
      city: "City",
      branches: "Number of branches",
      type: "Atelier type",
      types: { bridal: "Bridal", soiree: "Soirée", both: "Both" },
      submit: "Send on WhatsApp",
      sentHint: "WhatsApp opens with a ready message. Press send.",
      missing: "Please enter at least your name and number.",
    },
    faq: {
      title: "Questions we get a lot",
      items: [
        {
          q: "Do I have to move my old data?",
          a: "No. We start with your dresses and upcoming bookings, and help import a spreadsheet if you have one.",
        },
        {
          q: "My staff are not tech people. Can they use it?",
          a: "The screens are in Arabic and simple, and we train your staff ourselves, free at the start.",
        },
        {
          q: "Is my customer and booking data safe?",
          a: "Each atelier has its own account and separate data, and each employee sees only what their permission allows.",
        },
        {
          q: "What if I have more than one branch?",
          a: "Each branch has its own stock and bookings and you see them all. The price is 500 EGP per branch.",
        },
        {
          q: "Can I cancel?",
          a: "Any time. No forced contract, and you can take a copy of your data.",
        },
      ],
    },
    footer: {
      line: "Gateling Atelier by Gateling Solutions",
      other: "العربية",
      otherHref: "/",
    },
  },
};
