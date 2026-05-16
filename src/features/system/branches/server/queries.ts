import { asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";

import {
  BranchesTable,
  BranchMembershipsTable,
  UsersTable,
} from "@/drizzle/schema";

import type { ListBranchesInput } from "./schemas";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
import type { BranchGridRow } from "./types";

function buildWhereClause(input: ListBranchesInput) {
  const query = input.globalFilter?.trim();

  if (!query) {
    return undefined;
  }

  const likeValue = `%${query}%`;
  return or(
    ilike(BranchesTable.shortCode, likeValue),
    ilike(BranchesTable.nameEn, likeValue),
    ilike(BranchesTable.nameAr, likeValue),
    ilike(BranchesTable.phone, likeValue),
    ilike(BranchesTable.addressEn, likeValue),
    ilike(BranchesTable.addressAr, likeValue),
  );
}

function sortExpr(input: ListBranchesInput) {
  const firstSort = input.sorting[0];
  const memberCountExpr = sql<number>`count(distinct ${BranchMembershipsTable.userId})::int`;

  if (!firstSort) {
    return [asc(BranchesTable.nameEn)];
  }

  switch (firstSort.id) {
    case "shortCode":
      return [
        firstSort.desc
          ? desc(BranchesTable.shortCode)
          : asc(BranchesTable.shortCode),
      ];
    case "nameAr":
      return [
        firstSort.desc ? desc(BranchesTable.nameAr) : asc(BranchesTable.nameAr),
      ];
    case "ownerName":
      return [
        firstSort.desc ? desc(UsersTable.name) : asc(UsersTable.name),
        asc(BranchesTable.nameEn),
      ];
    case "memberCount":
      return [
        firstSort.desc ? desc(memberCountExpr) : asc(memberCountExpr),
        asc(BranchesTable.nameEn),
      ];
    case "createdAt":
      return [
        firstSort.desc
          ? desc(BranchesTable.createdAt)
          : asc(BranchesTable.createdAt),
      ];
    case "updatedAt":
      return [
        firstSort.desc
          ? desc(BranchesTable.updatedAt)
          : asc(BranchesTable.updatedAt),
      ];
    case "nameEn":
    default:
      return [
        firstSort.desc ? desc(BranchesTable.nameEn) : asc(BranchesTable.nameEn),
      ];
  }
}

export async function listBranches(ctx: TRPCContext, input: ListBranchesInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const whereClause = buildWhereClause(input);
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(BranchesTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;
  const memberCountExpr = sql<number>`count(distinct ${BranchMembershipsTable.userId})::int`;

  const rows = await ctx.db
    .select({
      id: BranchesTable.id,
      shortCode: BranchesTable.shortCode,
      nameEn: BranchesTable.nameEn,
      nameAr: BranchesTable.nameAr,
      addressEn: BranchesTable.addressEn,
      addressAr: BranchesTable.addressAr,
      phone: BranchesTable.phone,
      opensAt: BranchesTable.opensAt,
      closesAt: BranchesTable.closesAt,
      mapUrl: BranchesTable.mapUrl,
      ownerId: BranchesTable.ownerId,
      ownerName: UsersTable.name,
      memberCount: memberCountExpr,
      createdAt: BranchesTable.createdAt,
      updatedAt: BranchesTable.updatedAt,
    })
    .from(BranchesTable)
    .leftJoin(UsersTable, eq(BranchesTable.ownerId, UsersTable.id))
    .leftJoin(
      BranchMembershipsTable,
      eq(BranchMembershipsTable.branchId, BranchesTable.id),
    )
    .where(whereClause)
    .groupBy(BranchesTable.id, UsersTable.name)
    .orderBy(...sortExpr(input))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows as BranchGridRow[],
    pageCount,
    total: Number(total),
  };
}
