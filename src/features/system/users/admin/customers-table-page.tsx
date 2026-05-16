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
  getEntityColumnPinning,
  useDataTable,
  useTableUrlState,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { UsersImportButton } from "@/features/core/import-review";
import { useTRPC } from "@/integrations/trpc/client";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

import { UserDeleteDialog } from "./components/user-delete-dialog";
import { UserFormDialog } from "./components/user-form-dialog";
import { UserInfoModal } from "./components/user-info-modal";
import type { UserRowActionVariant } from "./components/user-row-actions";
import { UsersBulkActions } from "./components/users-bulk-actions";
import { UsersGridFilters } from "./components/users-grid-filters";
import { buildUserGridColumns } from "./components/users-table-columns";

type RowAction = { row: UserGridRow; variant: UserRowActionVariant } | null;

export function CustomersTablePage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { t, locale } = useTranslation();
  const addCustomerLabel = `${t("common.add")} ${t("systemPages.roleCustomer")}`;

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
    }),
    [
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      columnFilters,
      globalFilter,
    ],
  );

  const { data, isFetching } = useQuery(
    trpc.users.listCustomers.queryOptions(listInput),
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
    () => buildUserGridColumns({ t, locale, setRowAction }),
    [t, locale],
  );

  const {
    table,
    globalFilter: gf,
    setGlobalFilter: setGf,
  } = useDataTable({
    mode: "server",
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? 1,
    columns,
    getRowId: (r) => r.id,
    controlled,
  });

  const fetchAllRows = useCallback(async () => {
    const r = await queryClient.fetchQuery(
      trpc.users.exportRows.queryOptions({
        role: "customer",
        sorting,
        columnFilters,
        globalFilter: globalFilter || undefined,
      }),
    );
    return r.rows;
  }, [queryClient, trpc, sorting, columnFilters, globalFilter]);

  const closeRowAction = () => setRowAction(null);

  return (
    <div
      className={
        isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
      }
    >
      <div className="space-y-1">
        <H2>{t("systemPages.customersTitle")}</H2>
        <Lead>{t("systemPages.customersLead")}</Lead>
      </div>
      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={gf}
            onGlobalFilterChange={(v) => setGf(v)}
            searchPlaceholder={t("dataTable.searchUsersHint")}
            filterSlot={<UsersGridFilters table={table} />}
          >
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    className="size-8"
                    onClick={() => setCreateOpen(true)}
                    aria-label={addCustomerLabel}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>{addCustomerLabel}</TooltipContent>
            </Tooltip>
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="customers.csv"
              fetchAllRows={fetchAllRows}
              getExportRow={(row) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone,
                age: row.age,
                emailVerifiedAt: row.emailVerifiedAt,
                lastSignInAt: row.lastSignInAt,
                createdAt: row.createdAt,
              })}
            />
            <UsersImportButton role="customer" />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <UsersBulkActions table={table} />
          </DataTableActionBar>
        }
      />

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultRole="customer"
      />
      <UserFormDialog
        open={rowAction?.variant === "edit"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        user={rowAction?.variant === "edit" ? rowAction.row : null}
        defaultRole="customer"
      />
      <UserInfoModal
        open={rowAction?.variant === "info"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        user={rowAction?.variant === "info" ? rowAction.row : null}
      />
      <UserDeleteDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        ids={rowAction?.variant === "delete" ? [rowAction.row.id] : []}
        onDeleted={closeRowAction}
      />
    </div>
  );
}
