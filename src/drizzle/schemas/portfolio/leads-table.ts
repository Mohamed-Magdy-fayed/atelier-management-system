import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { id } from "@/drizzle/schemas/helpers";

export const leadStatusValues = [
  "new",
  "contacted",
  "qualified",
  "closed",
] as const;
export type LeadStatus = (typeof leadStatusValues)[number];
export const leadStatusEnum = pgEnum("lead_status", leadStatusValues);

export const LeadsTable = pgTable(
  "leads",
  {
    id,
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 256 }).notNull(),
    company: varchar({ length: 255 }),
    phone: varchar({ length: 32 }),
    message: text().notNull(),
    status: leadStatusEnum().notNull().default("new"),
    source: varchar({ length: 128 }).default("contact-form"),
    ipAddress: varchar({ length: 64 }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  },
  (table) => [
    index("leads_status_idx").on(table.status),
    index("leads_created_at_idx").on(table.createdAt),
    index("leads_email_idx").on(table.email),
  ],
);

export type Lead = typeof LeadsTable.$inferSelect;
export type NewLead = typeof LeadsTable.$inferInsert;
