"use client";

import type { Table } from "@tanstack/react-table";

import {
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
  DataTableSliderFilter,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

import { verifiedFilterOptions } from "./users-table-columns";

export function UsersGridFilters({ table }: { table: Table<UserGridRow> }) {
  const { t } = useTranslation();
  const verifiedOpts = verifiedFilterOptions(t);
  const ageColumn = table.getColumn("age");
  const verifiedColumn = table.getColumn("verified");
  const createdAtColumn = table.getColumn("createdAt");
  const lastSignInAtColumn = table.getColumn("lastSignInAt");

  return (
    <>
      {ageColumn ? (
        <DataTableSliderFilter
          column={ageColumn}
          title={String(t("forms.age"))}
          min={0}
          max={100}
        />
      ) : null}
      {verifiedColumn ? (
        <DataTableFacetedFilter
          column={verifiedColumn}
          title={String(t("dataTable.verified"))}
          options={verifiedOpts}
        />
      ) : null}
      {createdAtColumn ? (
        <DataTableDateRangeFilter
          column={createdAtColumn}
          title={String(t("forms.createdAt"))}
        />
      ) : null}
      {lastSignInAtColumn ? (
        <DataTableDateRangeFilter
          column={lastSignInAtColumn}
          title={String(t("dataTable.lastSignIn"))}
        />
      ) : null}
    </>
  );
}
