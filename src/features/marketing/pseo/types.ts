export type PseoFamily = "hulul" | "namazig" | "barnamag-atelier";

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
};

export const rowPath = (r: Pick<PseoRow, "family" | "slug">) =>
  `/ar/${FAMILY_META[r.family].path}/${r.slug}`;
