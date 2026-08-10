"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { EmployeeGridRow } from "@/features/system/users/server/types";

import { EmployeeBranchBadges } from "./employee-branch-badges";
import type { SetUserRowAction } from "./user-row-actions";
import { buildUserGridColumns } from "./users-table-columns";

type Translate = ReturnType<typeof useTranslation>["t"];

export function staffRoleFilterOptions(t: Translate) {
  return [
    { label: String(t("systemPages.roleEmployee")), value: "employee" },
    { label: String(t("systemPages.roleAdmin")), value: "admin" },
  ];
}

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

  const roleOptions = staffRoleFilterOptions(t);

  const roleColumn: ColumnDef<EmployeeGridRow> = {
    id: "role",
    accessorFn: (row) => row.role,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={String(t("systemPages.userRole"))}
      />
    ),
    meta: {
      label: String(t("systemPages.userRole")),
      filterVariant: "multiSelect",
      options: roleOptions,
    },
    cell: ({ row }) =>
      row.original.role === "admin" ? (
        <Badge>{String(t("systemPages.roleAdmin"))}</Badge>
      ) : (
        <Badge variant="outline">
          {String(t("systemPages.roleEmployee"))}
        </Badge>
      ),
    filterFn: (row, _id, value) => {
      const selected = value as string[] | undefined;
      if (!selected?.length) return true;
      return selected.includes(row.original.role);
    },
  };

  const hasPasswordColumn: ColumnDef<EmployeeGridRow> = {
    id: "hasPassword",
    accessorFn: (row) => (row.hasPassword ? "true" : "false"),
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={String(t("systemPages.userHasPassword"))}
      />
    ),
    meta: {
      label: String(t("systemPages.userHasPassword")),
      filterVariant: "multiSelect",
      options: [
        { label: String(t("systemPages.userHasPasswordYes")), value: "true" },
        { label: String(t("systemPages.userHasPasswordNo")), value: "false" },
      ],
    },
    cell: ({ row }) =>
      row.original.hasPassword ? (
        <Badge variant="secondary">
          {String(t("systemPages.userHasPasswordYes"))}
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          {String(t("systemPages.userHasPasswordNo"))}
        </Badge>
      ),
    filterFn: (row, _id, value) => {
      const selected = value as string[] | undefined;
      if (!selected?.length) return true;
      return selected.includes(row.original.hasPassword ? "true" : "false");
    },
  };

  const phoneIndex = base.findIndex(
    (column) =>
      "accessorKey" in column && column.accessorKey === "phone",
  );
  const insertAt = phoneIndex >= 0 ? phoneIndex + 1 : 3;

  return [
    ...base.slice(0, insertAt),
    roleColumn,
    branchesColumn,
    hasPasswordColumn,
    ...base.slice(insertAt),
  ];
}
