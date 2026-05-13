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

/**
 * Renders the user-grid filter triggers as a fragment so the parent toolbar
 * controls the layout (inline row on desktop, stacked popover on mobile).
 */
export function UsersGridFilters({ table }: { table: Table<UserGridRow> }) {
  const { t } = useTranslation();
  const verifiedOpts = verifiedFilterOptions(t);

  return (
    <>
      <DataTableSliderFilter
        column={table.getColumn("age")!}
        title={String(t("forms.age"))}
        min={0}
        max={100}
      />
      <DataTableFacetedFilter
        column={table.getColumn("verified")}
        title={String(t("dataTable.verified"))}
        options={verifiedOpts}
      />
      <DataTableDateRangeFilter
        column={table.getColumn("createdAt")!}
        title={String(t("forms.createdAt"))}
      />
      <DataTableDateRangeFilter
        column={table.getColumn("lastSignInAt")!}
        title={String(t("dataTable.lastSignIn"))}
      />
    </>
  );
}
