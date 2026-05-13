import { pgTable, boolean, integer, varchar } from "drizzle-orm/pg-core";

import {
  createdAt,
  createdBy,
  deletedAt,
  deletedBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";

export const ProductsTable = pgTable("products", {
  id,
  code: varchar({ length: 32 }).notNull(),
  nameEn: varchar({ length: 128 }).notNull(),
  nameAr: varchar({ length: 128 }).notNull(),
  price: integer().notNull(),
  isActive: boolean().notNull().default(true),
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  deletedBy,
  deletedAt,
});

export type Product = typeof ProductsTable.$inferSelect;
export type NewProduct = typeof ProductsTable.$inferInsert;
