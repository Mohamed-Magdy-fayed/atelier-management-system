"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ColumnPinningState,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/react-table";
import { useCallback, useMemo, useState } from "react";

import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import {
  DataTable,
  DataTableActionBar,
  type DataTableControlledState,
  DataTableExportButton,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  getEntityColumnPinning,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { PaymentGridRow } from "@/integrations/trpc/routers/payments";

import {
  buildPaymentColumns,
  PaymentInfoModal,
  PaymentsBulkActions,
  PaymentsGridFilters,
  type PaymentRowActionVariant,
} from "./components";

type RowAction = {
  row: PaymentGridRow;
  variant: PaymentRowActionVariant;
} | null;

export function PaymentsTablePage() {
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

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    getEntityColumnPinning(),
  );

  const listInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      sorting,
      columnFilters,
      globalFilter: globalFilter || undefined,
      branchId,
    }),
    [
      branchId,
      columnFilters,
      globalFilter,
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
    ],
  );

  const { data, isFetching } = useQuery(
    trpc.payments.list.queryOptions(listInput),
  );

  const controlled = useMemo<DataTableControlledState>(
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
      onRowSelectionChange: setRowSelection,
      columnVisibility,
      onColumnVisibilityChange: setColumnVisibility,
      columnPinning,
      onColumnPinningChange: setColumnPinning,
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

  const columns = useMemo(
    () => buildPaymentColumns({ locale, setRowAction, t }),
    [locale, t],
  );

  const closeRowAction = () => setRowAction(null);

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
      trpc.payments.exportRows.queryOptions({
        sorting,
        columnFilters,
        globalFilter: globalFilter || undefined,
        branchId,
      }),
    );

    return result.rows;
  }, [branchId, columnFilters, globalFilter, queryClient, sorting, trpc]);

  return (
    <div
      className={
        isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
      }
    >
      <EntityPageHeader slug="payments" />

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
            searchPlaceholder={t("dataTable.searchPaymentsHint")}
            filterSlot={<PaymentsGridFilters table={table} />}
          >
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="payments.csv"
              fetchAllRows={fetchAllRows}
              getExportRow={(row) => ({
                amount: row.amount,
                type: row.type,
                method: row.method,
                note: row.note,
                reservationId: row.reservationId,
                customerId: row.customerId,
                createdAt: row.createdAt,
              })}
            />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <PaymentsBulkActions table={table} />
          </DataTableActionBar>
        }
      />

      <PaymentInfoModal
        open={rowAction?.variant === "info"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        payment={rowAction?.variant === "info" ? rowAction.row : null}
      />
    </div>
  );
}
