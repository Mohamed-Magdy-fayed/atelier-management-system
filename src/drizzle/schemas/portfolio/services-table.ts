import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
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

export const ServicesTable = pgTable(
  "services",
  {
    id,
    title: varchar({ length: 255 }).notNull(),
    slug: varchar({ length: 255 }).notNull().unique(),
    shortDescription: varchar({ length: 512 }).notNull(),
    fullDescription: varchar({ length: 2048 }),
    icon: varchar({ length: 64 }).notNull().default("Zap"),
    features: jsonb().$type<string[]>().notNull().default([]),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
    deletedBy,
    deletedAt,
  },
  (table) => [index("services_active_idx").on(table.isActive)],
);

export type Service = typeof ServicesTable.$inferSelect;
export type NewService = typeof ServicesTable.$inferInsert;
