/**
 * Default legal text for a client install.
 *
 * Starting-point templates, NOT legal advice: have counsel review them for the
 * jurisdiction a client operates in before an install goes live. `{brand}` is
 * replaced with the client's business name.
 */
export type LegalSection = { heading: string; body: string[] };
export type LegalDocument = {
  title: string;
  updated: string;
  sections: LegalSection[];
};

export type LegalLocale = "en" | "ar";

export const LEGAL_LAST_UPDATED = "2026-11-18";

export const PRIVACY: Record<LegalLocale, LegalDocument> = {
  en: {
    title: "Privacy Policy",
    updated: `Last updated ${LEGAL_LAST_UPDATED}`,
    sections: [
      {
        heading: "Who we are",
        body: [
          "{brand} (“we”) rents dresses and garments. This policy explains what personal data we collect when you browse our catalogue, create an account or make a reservation, and how we use it.",
        ],
      },
      {
        heading: "What we collect",
        body: [
          "Contact details: your name, phone number and email address.",
          "Reservation details: the item, dates, amounts paid, notes, and any photo or ID reference a branch asks for when you collect an item.",
          "Account data: a sign-in method (password, Google or passkey) and your language preference.",
          "Technical data: essential cookies that keep you signed in and remember your language and theme. We do not use advertising cookies.",
        ],
      },
      {
        heading: "Why we use it",
        body: [
          "To take and manage reservations, record payments, and contact you about pickups, returns and fittings.",
          "To keep our records and prevent fraud or unreturned items.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Only service providers that run the system for us: hosting and database, email delivery, messaging (such as WhatsApp) and image storage. They may only use your data to provide those services. We do not sell your data.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep reservation and payment records for as long as needed for accounting and legal obligations, and account data until you ask us to delete it.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can ask us for a copy of your data, to correct it, or to delete it, subject to records we must keep by law. Contact any of our branches and we will respond within 30 days.",
        ],
      },
    ],
  },
  ar: {
    title: "سياسة الخصوصية",
    updated: `آخر تحديث ${LEGAL_LAST_UPDATED}`,
    sections: [
      {
        heading: "من نحن",
        body: [
          "{brand} («نحن») تؤجّر الفساتين والملابس. توضّح هذه السياسة البيانات الشخصية التي نجمعها عند تصفّح الكتالوج أو إنشاء حساب أو إجراء حجز، وكيف نستخدمها.",
        ],
      },
      {
        heading: "ما الذي نجمعه",
        body: [
          "بيانات التواصل: الاسم ورقم الهاتف والبريد الإلكتروني.",
          "بيانات الحجز: القطعة والتواريخ والمبالغ المدفوعة والملاحظات، وأي صورة أو مرجع هوية يطلبه الفرع عند الاستلام.",
          "بيانات الحساب: طريقة تسجيل الدخول (كلمة مرور أو Google أو مفتاح مرور) وتفضيل اللغة.",
          "بيانات تقنية: ملفات تعريف ارتباط أساسية تُبقيك مسجّلًا وتحفظ اللغة والمظهر. لا نستخدم ملفات تعريف ارتباط إعلانية.",
        ],
      },
      {
        heading: "لماذا نستخدمها",
        body: [
          "لاستلام الحجوزات وإدارتها وتسجيل المدفوعات والتواصل معك بشأن الاستلام والإرجاع وجلسات القياس.",
          "للحفاظ على سجلاتنا ومنع الاحتيال أو عدم إرجاع القطع.",
        ],
      },
      {
        heading: "مع من نشاركها",
        body: [
          "فقط مع مزوّدي الخدمة الذين يشغّلون النظام لنا: الاستضافة وقاعدة البيانات وإرسال البريد والمراسلة (مثل واتساب) وتخزين الصور. لا يجوز لهم استخدام بياناتك إلا لتقديم هذه الخدمات. نحن لا نبيع بياناتك.",
        ],
      },
      {
        heading: "مدة الاحتفاظ",
        body: [
          "نحتفظ بسجلات الحجز والدفع للمدة اللازمة للمحاسبة والالتزامات القانونية، وببيانات الحساب إلى أن تطلب حذفها.",
        ],
      },
      {
        heading: "حقوقك",
        body: [
          "يمكنك أن تطلب نسخة من بياناتك أو تصحيحها أو حذفها، مع مراعاة السجلات التي يلزمنا القانون بالاحتفاظ بها. تواصل مع أي فرع من فروعنا وسنردّ خلال 30 يومًا.",
        ],
      },
    ],
  },
};

export const TERMS: Record<LegalLocale, LegalDocument> = {
  en: {
    title: "Terms of Rental",
    updated: `Last updated ${LEGAL_LAST_UPDATED}`,
    sections: [
      {
        heading: "Reservations and deposits",
        body: [
          "A reservation is confirmed when {brand} records your deposit. The deposit counts toward the rental price. The remaining balance is due on pickup unless the branch agrees otherwise.",
        ],
      },
      {
        heading: "Pickup and return",
        body: [
          "Items must be returned to the branch by the return date and time on your receipt, in the condition they were given, with all accessories.",
          "Late returns may be charged a late fee for each day the item is kept, as stated on your receipt or by the branch.",
        ],
      },
      {
        heading: "Fittings and alterations",
        body: [
          "Alterations must be agreed with the branch. Do not cut, dye or permanently alter any item. Alterations that are not agreed may be charged at the repair cost.",
        ],
      },
      {
        heading: "Damage and loss",
        body: [
          "Normal wear is accepted. You are responsible for damage beyond normal wear, stains that cannot be removed by cleaning, and loss of the item. The cost may be taken from your security deposit or insurance amount, and the rest charged to you.",
        ],
      },
      {
        heading: "Cancellations",
        body: [
          "Cancellation and refund terms are set by the branch and shown on your receipt. Ask before you pay if anything is unclear.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "We may update these terms. The version in force when you make a reservation applies to that reservation.",
        ],
      },
    ],
  },
  ar: {
    title: "شروط الإيجار",
    updated: `آخر تحديث ${LEGAL_LAST_UPDATED}`,
    sections: [
      {
        heading: "الحجز والمقدم",
        body: [
          "يتأكد الحجز عندما تسجّل {brand} مقدّمك. يُحسب المقدم من سعر الإيجار، ويُسدَّد الباقي عند الاستلام ما لم يتفق الفرع على غير ذلك.",
        ],
      },
      {
        heading: "الاستلام والإرجاع",
        body: [
          "يجب إرجاع القطع إلى الفرع في تاريخ ووقت الإرجاع المكتوبين في الإيصال، بالحالة التي سُلّمت بها ومع جميع الملحقات.",
          "قد تُفرض غرامة تأخير عن كل يوم تُحتجز فيه القطعة، وفق ما هو مذكور في الإيصال أو يحدده الفرع.",
        ],
      },
      {
        heading: "القياس والتعديلات",
        body: [
          "يجب الاتفاق مع الفرع على أي تعديل. يُمنع قصّ القطعة أو صبغها أو تغييرها بشكل دائم، وقد تُحمَّل تكلفة الإصلاح عن أي تعديل غير متفق عليه.",
        ],
      },
      {
        heading: "التلف والفقد",
        body: [
          "يُقبل الاستهلاك العادي. تتحمل مسؤولية التلف الزائد عن الاستخدام العادي والبقع التي لا تزول بالتنظيف وفقد القطعة. وقد تُخصم التكلفة من مبلغ التأمين، ويُحصَّل الباقي منك.",
        ],
      },
      {
        heading: "الإلغاء",
        body: [
          "تحدد الفروع شروط الإلغاء واسترداد المبالغ وتظهر في الإيصال. اسأل قبل الدفع إن كان أي شيء غير واضح.",
        ],
      },
      {
        heading: "التغييرات",
        body: [
          "قد نحدّث هذه الشروط. تنطبق النسخة السارية وقت الحجز على ذلك الحجز.",
        ],
      },
    ],
  },
};
