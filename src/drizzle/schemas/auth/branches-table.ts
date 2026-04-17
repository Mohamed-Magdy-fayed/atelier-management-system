import { relations } from "drizzle-orm";
import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "@/drizzle/schemas/helpers";
import { BranchMembershipsTable, UsersTable } from ".";

export const BranchesTable = pgTable("branches", {
	id,
	nameEn: varchar({ length: 128 }).notNull(),
	nameAr: varchar({ length: 128 }).notNull(),
	ownerId: uuid().references(() => UsersTable.id, { onDelete: "set null" }),
	createdAt,
	updatedAt,
});

export const branchesRelations = relations(BranchesTable, ({ many, one }) => ({
	memberships: many(BranchMembershipsTable),
	owner: one(UsersTable, {
		fields: [BranchesTable.ownerId],
		references: [UsersTable.id],
	}),
}));

export type Branch = typeof BranchesTable.$inferSelect;
export type NewBranch = typeof BranchesTable.$inferInsert;
