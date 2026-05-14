"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  createSelectColumn,
  DataTableColumnHeader,
  isDateRangeValue,
  isNumberRangeValue,
  rowTimestampInYmdRange,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

import { type SetUserRowAction, UserRowActions } from "./user-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

export function verifiedFilterOptions(t: Translate) {
  return [
    { label: String(t("dataTable.verifiedYes")), value: "true" },
    { label: String(t("dataTable.verifiedNo")), value: "false" },
  ];
}

export function buildUserGridColumns(opts: {
  t: Translate;
  locale: string;
  setRowAction: SetUserRowAction;
}): ColumnDef<UserGridRow>[] {
  const { t, locale, setRowAction } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
  });
  const dateTimeFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const verifiedOptions = verifiedFilterOptions(t);

  return [
    createSelectColumn<UserGridRow>(),
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("forms.name"))}
        />
      ),
      meta: { label: String(t("forms.name")), filterVariant: "text" },
      filterFn: (row, _id, value) => {
        const q = String(value ?? "")
          .trim()
          .toLowerCase();
        if (!q) return true;
        const n = row.original.name?.toLowerCase() ?? "";
        return n.includes(q);
      },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("dataTable.columnEmail"))}
        />
      ),
      meta: {
        label: String(t("dataTable.columnEmail")),
        filterVariant: "text",
      },
      filterFn: (row, _id, value) => {
        const q = String(value ?? "")
          .trim()
          .toLowerCase();
        if (!q) return true;
        return row.original.email.toLowerCase().includes(q);
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("dataTable.phone"))}
        />
      ),
      meta: { label: String(t("dataTable.phone")), filterVariant: "text" },
      cell: ({ row }) => row.original.phone ?? "—",
      filterFn: (row, _id, value) => {
        const q = String(value ?? "")
          .trim()
          .toLowerCase();
        if (!q) return true;
        const p = row.original.phone?.toLowerCase() ?? "";
        return p.includes(q);
      },
    },
    {
      accessorKey: "age",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={String(t("forms.age"))} />
      ),
      meta: { label: String(t("forms.age")), filterVariant: "numberRange" },
      cell: ({ row }) => row.original.age ?? "—",
      filterFn: (row, _id, value) => {
        if (!isNumberRangeValue(value)) return true;
        const { min, max } = value;
        if (min == null && max == null) return true;
        const age = row.original.age;
        if (age == null) return false;
        if (min != null && age < min) return false;
        if (max != null && age > max) return false;
        return true;
      },
    },
    {
      id: "verified",
      accessorFn: (row) => (row.emailVerifiedAt ? "true" : "false"),
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("dataTable.verified"))}
        />
      ),
      meta: {
        label: String(t("dataTable.verified")),
        filterVariant: "multiSelect",
        options: verifiedOptions,
      },
      cell: ({ row }) =>
        row.original.emailVerifiedAt ? (
          <Badge variant="secondary">
            {String(t("dataTable.verifiedYes"))}
          </Badge>
        ) : (
          <Badge variant="outline">{String(t("dataTable.verifiedNo"))}</Badge>
        ),
      filterFn: (row, _id, value) => {
        const arr = value as string[] | undefined;
        if (!arr?.length) return true;
        const v = row.original.emailVerifiedAt ? "true" : "false";
        return arr.includes(v);
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("forms.createdAt"))}
        />
      ),
      meta: { label: String(t("forms.createdAt")), filterVariant: "dateRange" },
      cell: ({ row }) =>
        row.original.createdAt
          ? dateFmt.format(new Date(row.original.createdAt))
          : "—",
      filterFn: (row, _id, value) => {
        if (!isDateRangeValue(value)) return true;
        if (!value.from?.trim() && !value.to?.trim()) return true;
        return rowTimestampInYmdRange(row.original.createdAt, value);
      },
    },
    {
      accessorKey: "lastSignInAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("dataTable.lastSignIn"))}
        />
      ),
      meta: {
        label: String(t("dataTable.lastSignIn")),
        filterVariant: "dateRange",
      },
      cell: ({ row }) =>
        row.original.lastSignInAt
          ? dateTimeFmt.format(new Date(row.original.lastSignInAt))
          : "—",
      filterFn: (row, _id, value) => {
        if (!isDateRangeValue(value)) return true;
        if (!value.from?.trim() && !value.to?.trim()) return true;
        return rowTimestampInYmdRange(row.original.lastSignInAt, value);
      },
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      size: 48,
      meta: { label: String(t("common.actions")) },
      header: () => (
        <span className="text-xs font-medium">
          {String(t("common.actions"))}
        </span>
      ),
      cell: ({ row }) => (
        <UserRowActions row={row.original} setRowAction={setRowAction} />
      ),
    },
  ];
}
