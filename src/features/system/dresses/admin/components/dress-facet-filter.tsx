"use client";

import { useQuery } from "@tanstack/react-query";
import type { Column } from "@tanstack/react-table";
import { useMemo } from "react";

import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { DataTableFacetedFilter } from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";

type DressFacetFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>;
  /** Row counts per dress id, from the grid's own query. */
  counts?: Record<string, number>;
};

/**
 * "Filter by dress" for any grid that has the notion of one — searchable and
 * multi-select, drawing on a single shared option list so payments, expenses
 * and reservations all offer the same dresses in the same order.
 */
export function DressFacetFilter<TData, TValue>({
  column,
  counts,
}: DressFacetFilterProps<TData, TValue>) {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const branchState = useBranch();
  const branchId = branchState?.hasActiveOrg
    ? branchState.activeBranch.id
    : undefined;

  const { data } = useQuery(
    trpc.dresses.filterOptions.queryOptions(branchId ? { branchId } : {}),
  );

  const options = useMemo(
    () =>
      (data ?? []).map((dress) => ({
        value: dress.id,
        // Without an active branch the grid spans branches, so the option has
        // to say which one each dress belongs to.
        label: branchId
          ? `${dress.title} (${dress.code})`
          : `${dress.title} (${dress.code}) — ${locale === "ar" ? dress.branchNameAr : dress.branchNameEn}`,
      })),
    [branchId, data, locale],
  );

  if (!column || options.length === 0) return null;

  return (
    <DataTableFacetedFilter
      column={column}
      title={String(t("systemPages.reservationsDress"))}
      options={options}
      counts={counts}
      searchable
    />
  );
}
