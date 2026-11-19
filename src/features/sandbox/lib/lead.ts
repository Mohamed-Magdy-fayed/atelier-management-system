import { z } from "zod";

/** Gateling's public WhatsApp number (digits only, for `wa.me`). */
export const GATELING_WHATSAPP_DIGITS = "201271741743";

export function whatsappUrl(message?: string): string {
  const base = `https://wa.me/${GATELING_WHATSAPP_DIGITS}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const WORKAROUND_VALUES = [
  "notebook",
  "excel",
  "whatsapp",
  "software",
  "nothing",
] as const;

export const PRICE_REACTION_VALUES = ["fair", "expensive", "think"] as const;

export const CONTACT_CHANNEL_VALUES = ["whatsapp", "call"] as const;

/** Egyptian mobile numbers, with or without the country code. */
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s\-()]/g, ""))
  .refine((value) => /^(\+?20|0)?1[0125]\d{8}$/.test(value), {
    message: "invalid phone",
  });

export const leadSubmissionSchema = z.object({
  idempotencyKey: z.string().uuid(),
  locale: z.enum(["ar", "en"]),
  /** Honeypot: real visitors never see or fill this. */
  website: z.string().max(0).optional(),
  consent: z.object({
    contact: z.literal(true),
    storage: z.literal(true),
  }),
  business: z.object({
    ownerName: z.string().trim().min(1).max(160),
    name: z.string().trim().min(1).max(160),
    phone: phoneSchema,
    city: z.string().trim().max(160).optional(),
    branches: z.number().int().min(0).max(500).optional(),
    dresses: z.number().int().min(0).max(100_000).optional(),
  }),
  answers: z.object({
    workaround: z.array(z.enum(WORKAROUND_VALUES)).max(5),
    lastIncident: z.string().trim().max(2000).optional(),
    priceReaction: z.enum(PRICE_REACTION_VALUES).optional(),
    contactChannel: z.enum(CONTACT_CHANNEL_VALUES),
  }),
  social: z.string().trim().max(300).optional(),
  sandbox: z.object({
    branchAdded: z.boolean(),
    dressAdded: z.boolean(),
    device: z.enum(["mobile", "tablet", "desktop"]),
  }),
});

export type LeadSubmission = z.infer<typeof leadSubmissionSchema>;

/** Plain-text summary used for the WhatsApp fallback. */
export function leadToWhatsappText(lead: LeadSubmission): string {
  const lines = [
    lead.locale === "ar"
      ? "عايزة أبدأ حساب مجاني في جيتلينج أتيليه"
      : "I would like a free Gateling Atelier account",
    `${lead.business.ownerName} - ${lead.business.name} - ${lead.business.phone}`,
    lead.business.city ? lead.business.city : null,
    lead.business.branches !== undefined
      ? `Branches: ${lead.business.branches}`
      : null,
    lead.business.dresses !== undefined
      ? `Dresses: ${lead.business.dresses}`
      : null,
    lead.answers.workaround.length > 0
      ? `Today: ${lead.answers.workaround.join(", ")}`
      : null,
    lead.answers.lastIncident ? lead.answers.lastIncident : null,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}
