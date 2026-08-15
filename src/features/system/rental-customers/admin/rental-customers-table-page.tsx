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
  type DataTableControlledState,
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
import { useScreenPermission } from "@/features/core/auth/nextjs/hooks/use-screen-permission";
import { ImportButton } from "@/features/system/import/admin";
import { useTRPC } from "@/integrations/trpc/client";
import type { RentalCustomerGridRow } from "@/integrations/trpc/routers/rental-customers";

import {
  buildRentalCustomerColumns,
  RentalCustomerFormDialog,
  type RentalCustomerRowActionVariant,
  RentalCustomersGridFilters,
} from "./components";

type RowAction = {
  row: RentalCustomerGridRow;
  variant: RentalCustomerRowActionVariant;
} | null;

export function RentalCustomersTablePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const { canCreate } = useScreenPermission("customers");
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
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    getEntityColumnPinning(),
  );

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
    trpc.rentalCustomers.list.queryOptions(listInput),
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
    () => buildRentalCustomerColumns({ locale, setRowAction, t }),
    [locale, t],
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
      trpc.rentalCustomers.exportRows.queryOptions({
        sorting,
        columnFilters: wireColumnFilters,
        globalFilter: globalFilter || undefined,
        branchId,
      }),
    );

    return result.rows;
  }, [branchId, wireColumnFilters, globalFilter, queryClient, sorting, trpc]);

  return (
    <div
      className={
        isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
      }
    >
      <EntityPageHeader slug="customers" />

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
            searchPlaceholder={t("dataTable.searchCustomersHint")}
            filterSlot={<RentalCustomersGridFilters table={table} />}
          >
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="rental-customers.csv"
              fetchAllRows={fetchAllRows}
              getExportRow={(row) => ({
                name: row.name,
                phone: row.phone,
                reservationsCount: row.reservationsCount,
                createdAt: row.createdAt,
              })}
            />
            {/* Import writes rows, so it needs the create grant. */}
            {canCreate ? <ImportButton entitySlug="customers" /> : null}
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
      />

      <RentalCustomerFormDialog
        open={rowAction?.variant === "edit"}
        onOpenChange={(open) => {
          if (!open) setRowAction(null);
        }}
        customer={rowAction?.variant === "edit" ? rowAction.row : null}
      />
    </div>
  );
}
