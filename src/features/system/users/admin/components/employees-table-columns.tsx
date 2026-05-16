"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { EmployeeGridRow } from "@/features/system/users/server/types";

import { EmployeeBranchBadges } from "./employee-branch-badges";
import type { SetUserRowAction } from "./user-row-actions";
import { buildUserGridColumns } from "./users-table-columns";

type Translate = ReturnType<typeof useTranslation>["t"];

export function buildEmployeeGridColumns(opts: {
  t: Translate;
  locale: string;
  setRowAction: SetUserRowAction;
  branchFilterOptions: { label: string; value: string }[];
}): ColumnDef<EmployeeGridRow>[] {
  const { t, locale, setRowAction, branchFilterOptions } = opts;
  const base = buildUserGridColumns({
    t,
    locale,
    setRowAction,
  }) as ColumnDef<EmployeeGridRow>[];

  const branchesColumn: ColumnDef<EmployeeGridRow> = {
    id: "branches",
    accessorFn: (row) => row.branches.map((branch) => branch.id),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={String(t("systemPages.userAssignedBranches"))}
      />
    ),
    meta: {
      label: String(t("systemPages.userAssignedBranches")),
      filterVariant: "multiSelect",
      options: branchFilterOptions,
    },
    cell: ({ row }) => (
      <EmployeeBranchBadges
        branches={row.original.branches}
        locale={locale}
      />
    ),
    filterFn: (row, _id, value) => {
      const selected = value as string[] | undefined;
      if (!selected?.length) return true;
      return row.original.branches.some((branch) =>
        selected.includes(branch.id),
      );
    },
  };

  const phoneIndex = base.findIndex(
    (column) =>
      "accessorKey" in column && column.accessorKey === "phone",
  );
  const insertAt = phoneIndex >= 0 ? phoneIndex + 1 : 3;

  return [
    ...base.slice(0, insertAt),
    branchesColumn,
    ...base.slice(insertAt),
  ];
}
