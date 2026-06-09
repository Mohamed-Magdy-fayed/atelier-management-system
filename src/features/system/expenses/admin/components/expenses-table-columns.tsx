"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  createEntityActionsColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { ExpenseGridRow } from "@/integrations/trpc/routers/expenses";

import {
  ExpenseRowActions,
  type SetExpenseRowAction,
} from "./expense-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

function expenseTypeTranslationId(type: string) {
  switch (type) {
    case "drycleaning":
      return "systemPages.expenseTypeDrycleaning" as const;
    case "tailoring":
      return "systemPages.expenseTypeTailoring" as const;
    case "dressAcquisition":
      return "systemPages.expenseTypeDressAcquisition" as const;
    case "salary":
      return "systemPages.expenseTypeSalary" as const;
    default:
      return "systemPages.expenseTypeCustom" as const;
  }
}

export function buildExpenseColumns(opts: {
  locale: string;
  setRowAction: SetExpenseRowAction;
  t: Translate;
}): ColumnDef<ExpenseGridRow>[] {
  const { locale, setRowAction, t } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    dateStyle: "medium",
  });
  const moneyFmt = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    maximumFractionDigits: 0,
  });

  return [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.expensesDate"))}
        />
      ),
      meta: { label: String(t("systemPages.expensesDate")) },
      cell: ({ row }) =>
        row.original.date ? dateFmt.format(new Date(row.original.date)) : "—",
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.expensesType"))}
        />
      ),
      meta: { label: String(t("systemPages.expensesType")) },
      cell: ({ row }) => (
        <Badge variant="secondary">
          {String(t(expenseTypeTranslationId(row.original.type)))}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.expensesDescription"))}
        />
      ),
      meta: { label: String(t("systemPages.expensesDescription")) },
      cell: ({ row }) => (
        <span className="max-w-[220px] truncate block">
          {row.original.description}
        </span>
      ),
    },
    {
      accessorKey: "dressCode",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.expensesDress"))}
        />
      ),
      meta: { label: String(t("systemPages.expensesDress")) },
      cell: ({ row }) =>
        row.original.dressCode
          ? `${row.original.dressCode} — ${row.original.dressTitle ?? ""}`
          : "—",
    },
    {
      accessorKey: "employeeName",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.expensesEmployee"))}
        />
      ),
      meta: { label: String(t("systemPages.expensesEmployee")) },
      cell: ({ row }) => row.original.employeeName ?? "—",
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.expensesAmount"))}
        />
      ),
      meta: { label: String(t("systemPages.expensesAmount")) },
      cell: ({ row }) => moneyFmt.format(row.original.amount),
    },
    createEntityActionsColumn({
      t,
      size: 48,
      cell: ({ row }) => (
        <ExpenseRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
