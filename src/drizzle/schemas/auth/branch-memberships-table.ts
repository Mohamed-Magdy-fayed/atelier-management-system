import { relations } from "drizzle-orm";
import { boolean, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "@/drizzle/schemas/helpers";
import { BranchesTable, UsersTable } from ".";

export const BranchMembershipsTable = pgTable(
	"branch_memberships",
	{
		isCurrent: boolean(),
		branchId: uuid()
			.notNull()
			.references(() => BranchesTable.id, { onDelete: "cascade" }),
		userId: uuid()
			.notNull()
			.references(() => UsersTable.id, { onDelete: "cascade" }),
		createdAt,
		updatedAt,
	},
	(table) => [primaryKey({ columns: [table.branchId, table.userId] })],
);

export const branchMembershipRelations = relations(
	BranchMembershipsTable,
	({ one }) => ({
		branch: one(BranchesTable, {
			fields: [BranchMembershipsTable.branchId],
			references: [BranchesTable.id],
		}),
		user: one(UsersTable, {
			fields: [BranchMembershipsTable.userId],
			references: [UsersTable.id],
		}),
	}),
);

export type BranchMembership = typeof BranchMembershipsTable.$inferSelect;
export type NewBranchMembership = typeof BranchMembershipsTable.$inferInsert;
