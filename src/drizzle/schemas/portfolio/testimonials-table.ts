import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  createdAt,
  createdBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";
import { CaseStudiesTable } from "./case-studies-table";

export const TestimonialsTable = pgTable(
  "testimonials",
  {
    id,
    clientName: varchar({ length: 255 }).notNull(),
    company: varchar({ length: 255 }).notNull(),
    role: varchar({ length: 128 }),
    content: varchar({ length: 1024 }).notNull(),
    avatarUrl: varchar({ length: 1024 }),
    caseStudyId: uuid().references(() => CaseStudiesTable.id, {
      onDelete: "set null",
    }),
    isVisible: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
  },
  (table) => [
    index("testimonials_case_study_idx").on(table.caseStudyId),
    index("testimonials_visible_idx").on(table.isVisible),
  ],
);

export const testimonialsRelations = relations(
  TestimonialsTable,
  ({ one }) => ({
    caseStudy: one(CaseStudiesTable, {
      fields: [TestimonialsTable.caseStudyId],
      references: [CaseStudiesTable.id],
    }),
  }),
);

export type Testimonial = typeof TestimonialsTable.$inferSelect;
export type NewTestimonial = typeof TestimonialsTable.$inferInsert;
