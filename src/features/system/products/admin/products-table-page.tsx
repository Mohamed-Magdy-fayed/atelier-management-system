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
import { H2, Lead } from "@/components/ui/typography";
import {
  DataTable,
  DataTableActionBar,
  type DataTableControlledState,
  DataTableExportButton,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ProductGridRow } from "@/integrations/trpc/routers/products";

import {
  buildProductColumns,
  ProductDeleteDialog,
  ProductFormDialog,
  ProductInfoModal,
  ProductsBulkActions,
  ProductsGridFilters,
  ProductsImportButton,
  type ProductRowActionVariant,
} from "./components";

type RowAction = { row: ProductGridRow; variant: ProductRowActionVariant } | null;

export function ProductsTablePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const addProductLabel = `${t("common.add")} ${t("systemPages.productsTitle")}`;

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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({
    left: ["select"],
    right: [],
  });
  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const listInput = useMemo(
    () => ({
      page: pagination.pageIndex + 1,
      perPage: pagination.pageSize,
      sorting,
      columnFilters,
      globalFilter: globalFilter || undefined,
    }),
    [columnFilters, globalFilter, pagination.pageIndex, pagination.pageSize, sorting],
  );

  const { data, isFetching } = useQuery(
    trpc.products.list.queryOptions(listInput),
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
    () => buildProductColumns({ locale, setRowAction, t }),
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
      trpc.products.exportRows.queryOptions({
        sorting,
        columnFilters,
        globalFilter: globalFilter || undefined,
      }),
    );

    return result.rows;
  }, [columnFilters, globalFilter, queryClient, sorting, trpc]);

  return (
    <div
      className={isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"}
    >
      <div className="space-y-1">
        <H2>{t("systemPages.productsTitle")}</H2>
        <Lead>{t("systemPages.productsLead")}</Lead>
      </div>

      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={resolvedGlobalFilter}
            onGlobalFilterChange={(value) => setResolvedGlobalFilter(value)}
            searchPlaceholder={t("dataTable.searchProductsHint")}
            filterSlot={<ProductsGridFilters table={table} />}
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    className="size-8"
                    onClick={() => setCreateOpen(true)}
                    aria-label={addProductLabel}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>{addProductLabel}</TooltipContent>
            </Tooltip>
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="products.csv"
              fetchAllRows={fetchAllRows}
              getExportRow={(row) => ({
                code: row.code,
                nameEn: row.nameEn,
                nameAr: row.nameAr,
                price: row.price,
                isActive: row.isActive,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
              })}
            />
            <ProductsImportButton />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <ProductsBulkActions table={table} />
          </DataTableActionBar>
        }
      />

      <ProductFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ProductFormDialog
        open={rowAction?.variant === "edit"}
        onOpenChange={(open) => {
          if (!open) {
            closeRowAction();
          }
        }}
        product={rowAction?.variant === "edit" ? rowAction.row : null}
      />
      <ProductInfoModal
        open={rowAction?.variant === "info"}
        onOpenChange={(open) => {
          if (!open) {
            closeRowAction();
          }
        }}
        product={rowAction?.variant === "info" ? rowAction.row : null}
      />
      <ProductDeleteDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={(open) => {
          if (!open) {
            closeRowAction();
          }
        }}
        product={rowAction?.variant === "delete" ? rowAction.row : null}
        onDeleted={closeRowAction}
      />
    </div>
  );
}
