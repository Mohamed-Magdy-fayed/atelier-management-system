import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import {
  createdAt,
  createdBy,
  deletedAt,
  deletedBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";
import { TestimonialsTable } from "./testimonials-table";

export const caseStudyStatusValues = [
  "draft",
  "published",
  "archived",
] as const;
export type CaseStudyStatus = (typeof caseStudyStatusValues)[number];
export const caseStudyStatusEnum = pgEnum(
  "case_study_status",
  caseStudyStatusValues,
);

export type CaseStudyResults = {
  metrics: Array<{ label: string; value: string }>;
  summary: string;
};

export const CaseStudiesTable = pgTable(
  "case_studies",
  {
    id,
    title: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull().unique(),
    client: varchar({ length: 255 }).notNull(),
    industry: varchar({ length: 128 }).notNull(),
    problemStatement: text().notNull(),
    solution: text().notNull(),
    results: jsonb().$type<CaseStudyResults>().notNull(),
    coverImageUrl: varchar({ length: 1024 }),
    liveUrl: varchar({ length: 1024 }),
    status: caseStudyStatusEnum().notNull().default("draft"),
    publishedAt: timestamp({ withTimezone: true }),
    sortOrder: integer().notNull().default(0),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
    deletedBy,
    deletedAt,
  },
  (table) => [
    index("case_studies_status_idx").on(table.status),
    index("case_studies_slug_idx").on(table.slug),
  ],
);

export const caseStudiesRelations = relations(CaseStudiesTable, ({ many }) => ({
  testimonials: many(TestimonialsTable),
}));

export type CaseStudy = typeof CaseStudiesTable.$inferSelect;
export type NewCaseStudy = typeof CaseStudiesTable.$inferInsert;
