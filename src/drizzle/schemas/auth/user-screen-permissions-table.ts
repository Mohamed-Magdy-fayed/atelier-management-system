import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { createdAt, updatedAt } from "@/drizzle/schemas/helpers";
import { UsersTable } from ".";

/**
 * Per-user overrides for what a user may do on each system screen.
 *
 * A user with **no rows here** falls back to their role defaults
 * (`rolesPermissions` in features/core/auth/core/permissions.ts). The moment a
 * single row exists the map becomes exhaustive: any screen without a row is
 * denied. That is what lets "grant these three screens" be expressed without an
 * explicit deny row for every other screen — and it is why clearing the matrix
 * deletes every row rather than storing all-false ones, so there is always a way
 * back to the default.
 *
 * `screenKey` is a varchar rather than a pgEnum on purpose: the key list is
 * derived from SYSTEM_SCREEN_DEFINITIONS, so a pgEnum would turn every new
 * screen into an ALTER TYPE migration. Zod validates it at the tRPC boundary
 * against `screenKeys`, and rows naming a screen that no longer exists are inert
 * — the engine only ever looks up keys it is asked about.
 */
export const UserScreenPermissionsTable = pgTable(
  "user_screen_permissions",
  {
    userId: uuid()
      .notNull()
      .references(() => UsersTable.id, { onDelete: "cascade" }),
    screenKey: varchar({ length: 64 }).notNull(),
    canView: boolean().notNull().default(false),
    canCreate: boolean().notNull().default(false),
    canUpdate: boolean().notNull().default(false),
    canDelete: boolean().notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.screenKey] }),
    index("user_screen_permissions_user_idx").on(table.userId),
  ],
);

export const userScreenPermissionRelations = relations(
  UserScreenPermissionsTable,
  ({ one }) => ({
    user: one(UsersTable, {
      fields: [UserScreenPermissionsTable.userId],
      references: [UsersTable.id],
    }),
  }),
);

export type UserScreenPermission =
  typeof UserScreenPermissionsTable.$inferSelect;
export type NewUserScreenPermission =
  typeof UserScreenPermissionsTable.$inferInsert;
