import { relations } from "drizzle-orm";
import {
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
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
import {
	BiometricCredentialsTable,
	BranchMembershipsTable,
	UserCredentialsTable,
	UserOAuthAccountsTable,
	UserTokensTable,
} from "./";

export const userRoleValues = ["admin", "employee", "customer"] as const;
export type UserRole = (typeof userRoleValues)[number];
export const userRoleEnum = pgEnum("user_role", userRoleValues);

export const UsersTable = pgTable(
	"users",
	{
		id,
		email: varchar({ length: 256 }),
		name: varchar({ length: 256 }),
		phone: varchar({ length: 16 }),
		imageUrl: varchar({ length: 512 }),
		role: userRoleEnum().notNull().default("customer"),
		emailVerifiedAt: timestamp({ withTimezone: true }),
		phoneVerifiedAt: timestamp({ withTimezone: true }),
		lastSignInAt: timestamp({ withTimezone: true }),
		salary: integer(),
		createdAt,
		createdBy,
		updatedAt,
		updatedBy,
		deletedAt,
		deletedBy,
	},
	(table) => [
		uniqueIndex("users_email_unique").on(table.email),
		uniqueIndex("users_phone_unique").on(table.phone),
	],
);

export const usersRelations = relations(UsersTable, ({ many, one }) => ({
	credentials: one(UserCredentialsTable, {
		fields: [UsersTable.id],
		references: [UserCredentialsTable.userId],
	}),
	oauthAccounts: many(UserOAuthAccountsTable),
	branchMemberships: many(BranchMembershipsTable),
	tokens: many(UserTokensTable),
	biometricCredentials: many(BiometricCredentialsTable),
}));

export type User = typeof UsersTable.$inferSelect;
export type NewUser = typeof UsersTable.$inferInsert;
