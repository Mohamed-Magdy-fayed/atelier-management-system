import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  notInArray,
  or,
} from "drizzle-orm";

import { SettingsTable } from "@/drizzle/schema";
import {
  getSystemSettingDefinition,
  SECRET_SETTING_CODES,
  SYSTEM_SETTING_CODES,
} from "@/features/system/settings/lib/system-settings-registry";

import type { ListSettingsInput } from "./schemas";
import { secretHintFromStored } from "./secret-crypto";
import {
  assertAdminRole,
  getRequiredSession,
  type TRPCContext,
} from "./shared";
import type { SettingGridRow } from "./types";

function buildWhereClause(input: ListSettingsInput) {
  const systemOnly = inArray(SettingsTable.code, [...SYSTEM_SETTING_CODES]);
  const query = input.globalFilter?.trim();

  if (!query) {
    return systemOnly;
  }

  const likeValue = `%${query}%`;
  return and(
    systemOnly,
    or(
      ilike(SettingsTable.code, likeValue),
      ilike(SettingsTable.description, likeValue),
      // Value search skips secrets, so a stored token can never be confirmed by
      // typing it (or its tail) into the grid's search box.
      and(
        notInArray(SettingsTable.code, [...SECRET_SETTING_CODES]),
        ilike(SettingsTable.value, likeValue),
      ),
    ),
  );
}

function sortExpr(input: ListSettingsInput) {
  const firstSort = input.sorting[0];

  if (!firstSort) {
    return [asc(SettingsTable.code)];
  }

  switch (firstSort.id) {
    case "label":
      return [
        firstSort.desc ? desc(SettingsTable.label) : asc(SettingsTable.label),
        asc(SettingsTable.code),
      ];
    case "amount":
      return [
        firstSort.desc ? desc(SettingsTable.amount) : asc(SettingsTable.amount),
        asc(SettingsTable.code),
      ];
    case "isActive":
      return [
        firstSort.desc
          ? desc(SettingsTable.isActive)
          : asc(SettingsTable.isActive),
        asc(SettingsTable.code),
      ];
    case "createdAt":
      return [
        firstSort.desc
          ? desc(SettingsTable.createdAt)
          : asc(SettingsTable.createdAt),
      ];
    case "updatedAt":
      return [
        firstSort.desc
          ? desc(SettingsTable.updatedAt)
          : asc(SettingsTable.updatedAt),
      ];
    case "code":
    default:
      return [
        firstSort.desc ? desc(SettingsTable.code) : asc(SettingsTable.code),
      ];
  }
}

const settingGridSelect = {
  id: SettingsTable.id,
  code: SettingsTable.code,
  label: SettingsTable.label,
  description: SettingsTable.description,
  isActive: SettingsTable.isActive,
  value: SettingsTable.value,
  amount: SettingsTable.amount,
  createdAt: SettingsTable.createdAt,
  updatedAt: SettingsTable.updatedAt,
} as const;

export async function listSettings(ctx: TRPCContext, input: ListSettingsInput) {
  const session = getRequiredSession(ctx);
  assertAdminRole(session.user.role);

  const whereClause = buildWhereClause(input);
  const [{ value: total }] = await ctx.db
    .select({ value: count() })
    .from(SettingsTable)
    .where(whereClause);

  const pageCount = Math.max(1, Math.ceil(Number(total) / input.perPage));
  const page = Math.min(input.page, pageCount);
  const offset = (page - 1) * input.perPage;

  const rows = await ctx.db
    .select(settingGridSelect)
    .from(SettingsTable)
    .where(whereClause)
    .orderBy(...sortExpr(input))
    .limit(input.perPage)
    .offset(offset);

  return {
    rows: rows.map(toGridRow),
    pageCount,
    total: Number(total),
  };
}

/**
 * Swaps a secret's ciphertext for a masked hint.
 *
 * This is the only path settings take to a client, so doing it here means no
 * caller can forget. An unreadable value (a rotated key, say) yields a null
 * hint with `hasValue` still true — the diagnostics surface the real problem.
 */
function toGridRow(
  row: Omit<SettingGridRow, "valueHint" | "hasValue">,
): SettingGridRow {
  const isSecret = getSystemSettingDefinition(row.code)?.isSecret === true;

  if (!isSecret) {
    return { ...row, valueHint: null, hasValue: Boolean(row.value?.trim()) };
  }

  return {
    ...row,
    value: null,
    valueHint: secretHintFromStored(row.value),
    hasValue: Boolean(row.value?.trim()),
  };
}
