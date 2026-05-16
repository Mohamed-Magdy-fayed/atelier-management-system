import { UsersTable } from "@/drizzle/schema";

import type { UserImportRole } from "./schemas";

export type UserImportAction = "create" | "restore" | "skip";
export type UserImportStatus = "valid" | "invalid" | "done";

export type UserImportRowValues = {
  name: string | null;
  email: string;
  phone: string | null;
  age: number | null;
  role: UserImportRole;
};

export type UserImportPreviewRow = {
  rowNumber: number;
  status: "valid" | "invalid";
  action: UserImportAction;
  reasons: string[];
  values: UserImportRowValues;
  targetUserId: string | null;
};

export type UserImportCommitRow = {
  rowNumber: number;
  status: "done" | "invalid";
  action: UserImportAction;
  reasons: string[];
  targetUserId: string | null;
};

export type UserGridRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  age: number | null;
  role: string;
  emailVerifiedAt: Date | null;
  lastSignInAt: Date | null;
  createdAt: Date | null;
  createdBy: string | null;
  updatedAt: Date | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
};

export type EmployeeBranchRef = {
  id: string;
  nameEn: string;
  nameAr: string;
};

export type EmployeeGridRow = UserGridRow & {
  branches: EmployeeBranchRef[];
};

export const userGridSelect = {
  id: UsersTable.id,
  name: UsersTable.name,
  email: UsersTable.email,
  phone: UsersTable.phone,
  age: UsersTable.age,
  role: UsersTable.role,
  emailVerifiedAt: UsersTable.emailVerifiedAt,
  lastSignInAt: UsersTable.lastSignInAt,
  createdAt: UsersTable.createdAt,
  createdBy: UsersTable.createdBy,
  updatedAt: UsersTable.updatedAt,
  updatedBy: UsersTable.updatedBy,
  deletedAt: UsersTable.deletedAt,
  deletedBy: UsersTable.deletedBy,
} as const;
