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
  DataTableActionBar,
  type DataTableControlledState,
  DataTableExportButton,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  formatCsvDate,
  formatCsvDateTime,
  getEntityColumnPinning,
  serializeColumnFiltersForServer,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ReservationGridRow } from "@/integrations/trpc/routers/reservations";

import {
  buildReservationColumns,
  ReservationFormDialog,
  ReservationsBulkActions,
  ReservationsGridFilters,
} from "./components";

export function ReservationsTablePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const branchState = useBranch();
  const branchId = branchState?.hasActiveOrg
    ? branchState.activeBranch.id
    : undefined;
  const addLabel = `${t("common.add")} ${t("systemPages.reservationsTitle")}`;

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

  // `dressId` is a zero-width placeholder column that only exists to back the
  // dress facet in the filter bar — it renders no header and no cell, so it
  // stays hidden. `enableHiding: false` on the column keeps it out of the
  // view-options menu, where it used to appear as a second "Dress" entry.
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    dressId: false,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    getEntityColumnPinning(),
  );
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [createOpen, setCreateOpen] = useState(false);

  // Date filters travel as absolute instants anchored to the viewer's midnight.
  // Sent as bare `YYYY-MM-DD` the server resolved them against ITS own calendar
  // (UTC in production), so an occasion date of "16 Aug" missed every row whose
  // occasion is Cairo midnight — that instant is 21:00Z on the 15th.
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
    trpc.reservations.list.queryOptions(listInput),
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
    () => buildReservationColumns({ locale, t }),
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
      trpc.reservations.exportRows.queryOptions({
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
      <EntityPageHeader slug="reservations" />

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
            searchPlaceholder={t("dataTable.searchReservationsHint")}
            filterSlot={
              <ReservationsGridFilters table={table} facets={data?.facets} />
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
              exportFileName="reservations.csv"
              fetchAllRows={fetchAllRows}
              getExportRow={(row) => ({
                reservationCode: row.reservationCode,
                customerName: row.customerName,
                customerPhone: row.customerPhone ?? "",
                totalPrice: row.totalPrice,
                insurance: row.insurance,
                discount: row.discount,
                depositPaid: row.depositPaid,
                totalPaid: row.totalPaid,
                remainingBalance: row.remainingBalance,
                status: row.status,
                dressId: row.dressId,
                dress: row.dressTitle,
                receivingDateTime: formatCsvDateTime(row.receivingDateTime),
                occasionDate: formatCsvDate(row.occasionDate),
                returnDateTime: formatCsvDateTime(row.returnDateTime),
                createdAt: formatCsvDateTime(row.createdAt),
              })}
            />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <ReservationsBulkActions table={table} />
          </DataTableActionBar>
        }
      />

      <ReservationFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
