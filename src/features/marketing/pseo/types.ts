export type PseoFamily =
  | "hulul"
  | "namazig"
  | "barnamag-atelier"
  | "barnamag"
  | "software";

export type PseoSection = {
  h2: string;
  paragraphs?: string[];
  /** Numbered steps. Also emitted as HowTo JSON-LD on `hulul` pages. */
  steps?: { title: string; body: string }[];
};

export type PseoRow = {
  family: PseoFamily;
  /** Latin transliterated slug (decision D6). Arabic lives in h1/title. */
  slug: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  sections: PseoSection[];
  /** Manual vs system comparison. Only claims the product really does. */
  comparison?: { aspect: string; manual: string; system: string }[];
  /** Copy-paste template text (family `namazig`). */
  template?: { heading: string; lines: string[]; note: string };
  /** Aggregate figures with their honest source (family `barnamag-atelier`). */
  dataPoints?: { label: string; value: string; source: string }[];
  faq: { q: string; a: string }[];
  related: { family: PseoFamily; slug: string }[];
  /** Nothing is indexed or listed until a human flips this. */
  published: boolean;
  updatedAt: string;
  /** Labels for `comparison` (default: by hand / with the software). */
  comparisonCols?: { heading: string; left: string; right: string };
};

export const FAMILY_META: Record<
  PseoFamily,
  { path: string; hubTitle: string; hubLead: string; crumb: string }
> = {
  hulul: {
    path: "hulul",
    crumb: "حلول",
    hubTitle: "حلول لمشاكل أتيليه تأجير الفساتين",
    hubLead: "إجابات عملية لأسئلة صاحبات الأتيليهات، خطوة بخطوة.",
  },
  namazig: {
    path: "namazig",
    crumb: "نماذج",
    hubTitle: "نماذج جاهزة لأتيليه تأجير الفساتين",
    hubLead: "نصوص جاهزة تنسخها وتعدّل عليها: عقد، إيصال، قائمة فحص.",
  },
  "barnamag-atelier": {
    path: "barnamag-atelier",
    crumb: "برنامج أتيليه",
    hubTitle: "برنامج إدارة أتيليه فساتين حسب المنطقة",
    hubLead: "ما نعرفه عن أتيليهات تأجير الفساتين في كل منطقة.",
  },
  barnamag: {
    path: "barnamag",
    crumb: "البرنامج",
    hubTitle: "برنامج أتيليه فساتين: كل ما تحتاج تعرفه",
    hubLead: "إيه اللي بيعمله البرنامج، وإزاي يقارن بالبدائل.",
  },
  software: {
    path: "software",
    crumb: "Software",
    hubTitle: "Dress rental software",
    hubLead: "Software for dress-rental ateliers.",
  },
};

/** English families live under `/en/...`, Arabic ones under `/ar/...`. */
export const isEnglishFamily = (f: PseoFamily) => f === "software";

export const hubPath = (f: PseoFamily) =>
  isEnglishFamily(f) ? "/en" : `/ar/${FAMILY_META[f].path}`;

export const rowPath = (r: Pick<PseoRow, "family" | "slug">) =>
  isEnglishFamily(r.family)
    ? `/en/${FAMILY_META[r.family].path}/${r.slug}`
    : `/ar/${FAMILY_META[r.family].path}/${r.slug}`;
