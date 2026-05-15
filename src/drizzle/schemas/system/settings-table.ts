import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  varchar,
} from "drizzle-orm/pg-core";

import {
  createdAt,
  createdBy,
  id,
  updatedAt,
  updatedBy,
} from "@/drizzle/schemas/helpers";

export const settingsLabels = ["policy", "integration"] as const;
export const settingsLabelEnum = pgEnum("settings_label", settingsLabels);
export type SettingsLabel = (typeof settingsLabels)[number];

export const SettingsTable = pgTable(
  "settings",
  {
    id,
    code: varchar({ length: 128 }).notNull().unique(),
    label: settingsLabelEnum().notNull(),
    description: text(),
    isActive: boolean(),
    value: text(),
    amount: integer(),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
  },
  (table) => ({
    codeIdx: index("settings_code_idx").on(table.code),
  }),
);

export type Setting = typeof SettingsTable.$inferSelect;
export type NewSetting = typeof SettingsTable.$inferInsert;
