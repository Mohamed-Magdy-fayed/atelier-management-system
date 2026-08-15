"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnPinningState,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/react-table";
import { PlusIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import {
  DataTable,
  DataTableExportButton,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  getEntityColumnPinning,
  serializeColumnFiltersForServer,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ExpenseGridRow } from "@/integrations/trpc/routers/expenses";

import {
  buildExpenseColumns,
  ExpenseDeleteDialog,
  ExpenseFormDialog,
  type ExpenseRowActionVariant,
  ExpensesGridFilters,
} from "./components";

type RowAction = {
  row: ExpenseGridRow;
  variant: ExpenseRowActionVariant;
} | null;

export function ExpensesTablePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const branchState = useBranch();
  const branchId = branchState?.hasActiveOrg
    ? branchState.activeBranch.id
    : undefined;

  const {
    pagination,
    sorting,
    columnFilters,
    globalFilter,
    setPagination,
    setSorting,
    setColumnFilters,
    setGlobalFilter,
  } = useTableUrlState({ page: 1, perPage: 20 });

  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [rowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning] = useState<ColumnPinningState>(() =>
    getEntityColumnPinning(),
  );
  const [createOpen, setCreateOpen] = useState(false);

  // Date filters travel as absolute instants anchored to the viewer's midnight.
  // Sent as bare `YYYY-MM-DD` the server resolved them against ITS own calendar
  // (UTC in production), so rows near a day boundary fell into the wrong day.
  const wireColumnFilters = useMemo(
    () => serializeColumnFiltersForServer(columnFilters),
    [columnFilters],
  );

  const listInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      sorting,
      columnFilters: wireColumnFilters,
      globalFilter: globalFilter || undefined,
      branchId,
    }),
    [
      branchId,
      wireColumnFilters,
      globalFilter,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
    ],
  );

  const { data, isFetching } = useQuery(
    trpc.expenses.list.queryOptions(listInput),
  );

  const moneyFmt = useMemo(
    () =>
      new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const columns = useMemo(
    () => buildExpenseColumns({ locale, setRowAction, t }),
    [locale, t],
  );

  const controlled = useMemo(
    () => ({
      pagination,
      onPaginationChange: setPagination,
      sorting,
      onSortingChange: setSorting,
      columnFilters,
      onColumnFiltersChange: setColumnFilters,
      globalFilter,
      onGlobalFilterChange: setGlobalFilter,
      rowSelection,
      onRowSelectionChange: () => {},
      columnVisibility,
      onColumnVisibilityChange: setColumnVisibility,
      columnPinning,
      onColumnPinningChange: () => {},
    }),
    [
      pagination,
      setPagination,
      sorting,
      setSorting,
      columnFilters,
      setColumnFilters,
      globalFilter,
      setGlobalFilter,
      rowSelection,
      columnVisibility,
      columnPinning,
    ],
  );

  const {
    table,
    globalFilter: resolvedGlobalFilter,
    setGlobalFilter: setResolvedGlobalFilter,
  } = useDataTable({
    mode: "server",
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    rowCount: data?.total ?? 0,
    columns,
    getRowId: (row) => row.id,
    controlled,
  });

  const fetchAllRows = useCallback(async () => {
    const result = await queryClient.fetchQuery(
      trpc.expenses.exportRows.queryOptions({
        sorting,
        columnFilters: wireColumnFilters,
        globalFilter: globalFilter || undefined,
        branchId,
      }),
    );
    return result.rows;
  }, [branchId, wireColumnFilters, globalFilter, queryClient, sorting, trpc]);

  const addLabel = String(t("systemPages.addExpense"));

  return (
    <div
      className={
        isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
      }
    >
      <EntityPageHeader slug="expenses" />

      {data?.totalAmount != null ? (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            {String(t("systemPages.expensesTotalExpenses"))}:{" "}
          </span>
          <span className="font-semibold">
            {moneyFmt.format(data.totalAmount)}
          </span>
        </div>
      ) : null}

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
            searchPlaceholder={String(t("forms.descriptionPlaceholder"))}
            filterSlot={
              <ExpensesGridFilters table={table} facets={data?.facets} />
            }
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    className="size-8"
                    onClick={() => setCreateOpen(true)}
                    aria-label={addLabel}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>{addLabel}</TooltipContent>
            </Tooltip>
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="expenses.csv"
              fetchAllRows={fetchAllRows}
              getExportRow={(row) => ({
                date: row.date,
                type: row.type,
                description: row.description,
                dressCode: row.dressCode ?? "",
                employeeName: row.employeeName ?? "",
                amount: row.amount,
                note: row.note ?? "",
                createdBy: row.createdBy,
              })}
            />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
      />

      <ExpenseFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        expense={null}
      />

      <ExpenseFormDialog
        open={rowAction?.variant === "edit"}
        onOpenChange={(open) => {
          if (!open) setRowAction(null);
        }}
        expense={rowAction?.variant === "edit" ? rowAction.row : null}
      />

      <ExpenseDeleteDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={(open) => {
          if (!open) setRowAction(null);
        }}
        expense={rowAction?.variant === "delete" ? rowAction.row : null}
      />
    </div>
  );
}
