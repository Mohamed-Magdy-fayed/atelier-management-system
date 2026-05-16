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
import { H2 } from "@/components/ui/typography";
import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import {
  DataTable,
  DataTableActionBar,
  type DataTableControlledState,
  DataTableExportButton,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  getEntityColumnPinning,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { DressGridRow } from "@/integrations/trpc/routers/dresses";

import {
  buildDressColumns,
  DressDeleteDialog,
  DressesBulkActions,
  DressesGridFilters,
  DressFormDialog,
  DressInfoModal,
  type DressRowActionVariant,
} from "./components";

type RowAction = {
  row: DressGridRow;
  variant: DressRowActionVariant;
} | null;

export function DressesTablePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const branchState = useBranch();
  const branchId = branchState?.hasActiveOrg
    ? branchState.activeBranch.id
    : undefined;
  const addDressLabel = `${t("common.add")} ${t("systemPages.dressesTitle")}`;

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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    createdAt: false,
  });
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() =>
    getEntityColumnPinning(),
  );
  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
    trpc.dresses.list.queryOptions(listInput),
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
    () => buildDressColumns({ locale, setRowAction, t }),
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

  const closeRowAction = () => setRowAction(null);

  const fetchAllRows = useCallback(async () => {
    const result = await queryClient.fetchQuery(
      trpc.dresses.exportRows.queryOptions({
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
      <div className="space-y-1">
        <H2>{t("systemPages.dressesTitle")}</H2>
      </div>

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
            searchPlaceholder={t("dataTable.searchDressesHint")}
            filterSlot={<DressesGridFilters table={table} />}
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    className="size-8"
                    onClick={() => setCreateOpen(true)}
                    aria-label={addDressLabel}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>{addDressLabel}</TooltipContent>
            </Tooltip>
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="dresses.csv"
              fetchAllRows={fetchAllRows}
              getExportRow={(row) => ({
                code: row.code,
                title: row.title,
                pricePerDay: row.pricePerDay,
                isActive: row.isActive,
                createdAt: row.createdAt,
              })}
            />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <DressesBulkActions table={table} />
          </DataTableActionBar>
        }
      />

      <DressFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DressFormDialog
        open={rowAction?.variant === "edit"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        dress={rowAction?.variant === "edit" ? rowAction.row : null}
      />
      <DressInfoModal
        open={rowAction?.variant === "info"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        dress={rowAction?.variant === "info" ? rowAction.row : null}
      />
      <DressDeleteDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        dress={rowAction?.variant === "delete" ? rowAction.row : null}
        onDeleted={closeRowAction}
      />
    </div>
  );
}
