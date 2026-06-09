"use client";

import type { Table } from "@tanstack/react-table";

import { expenseTypes } from "@/drizzle/schemas/system/expenses-table";
import {
  DataTableDateRangeFilter,
  DataTableFacetedFilter,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import type { ExpenseGridRow } from "@/integrations/trpc/routers/expenses";

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

export function ExpensesGridFilters({ table }: { table: Table<ExpenseGridRow> }) {
  const { t } = useTranslation();
  const typeColumn = table.getColumn("type");
  const dateColumn = table.getColumn("date");

  const typeOptions = expenseTypes.map((value) => ({
    value,
    label: String(t(expenseTypeTranslationId(value))),
  }));

  return (
    <>
      {typeColumn ? (
        <DataTableFacetedFilter
          column={typeColumn}
          title={String(t("systemPages.expensesType"))}
          options={typeOptions}
        />
      ) : null}
      {dateColumn ? (
        <DataTableDateRangeFilter
          column={dateColumn}
          title={String(t("systemPages.expensesDate"))}
        />
      ) : null}
    </>
  );
}
