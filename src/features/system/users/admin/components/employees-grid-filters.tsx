"use client";

import type { Table } from "@tanstack/react-table";

import { DataTableFacetedFilter } from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { EmployeeGridRow } from "@/features/system/users/server/types";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

import { UsersGridFilters } from "./users-grid-filters";

export function EmployeesGridFilters({
  branchFilterOptions,
  table,
}: {
  branchFilterOptions: { label: string; value: string }[];
  table: Table<EmployeeGridRow>;
}) {
  const { t } = useTranslation();

  const branchesColumn = table.getColumn("branches");
  const hasPasswordColumn = table.getColumn("hasPassword");

  return (
    <>
      {branchesColumn && branchFilterOptions.length > 0 ? (
        <DataTableFacetedFilter
          column={branchesColumn}
          title={String(t("systemPages.userAssignedBranches"))}
          options={branchFilterOptions}
        />
      ) : null}
      {hasPasswordColumn ? (
        <DataTableFacetedFilter
          column={hasPasswordColumn}
          title={String(t("systemPages.userHasPassword"))}
          options={[
            {
              label: String(t("systemPages.userHasPasswordYes")),
              value: "true",
            },
            {
              label: String(t("systemPages.userHasPasswordNo")),
              value: "false",
            },
          ]}
        />
      ) : null}
      <UsersGridFilters table={table as unknown as Table<UserGridRow>} />
    </>
  );
}
