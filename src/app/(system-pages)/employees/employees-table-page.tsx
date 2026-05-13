"use client";

import { useQuery } from "@tanstack/react-query";
import type { FilterFn } from "@tanstack/react-table";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

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
  DataTableExportImport,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  useDataTable,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { UserGridRow } from "@/integrations/trpc/routers/users";

import { UserDeleteDialog } from "../_components/user-delete-dialog";
import { UserFormDialog } from "../_components/user-form-dialog";
import { UserInfoModal } from "../_components/user-info-modal";
import type { UserRowActionVariant } from "../_components/user-row-actions";
import { buildUserGridColumns } from "../_components/users-table-columns";
import { UsersBulkActions } from "../_components/users-bulk-actions";
import { UsersGridFilters } from "../_components/users-grid-filters";

type RowAction = { row: UserGridRow; variant: UserRowActionVariant } | null;

const userGlobalFilter: FilterFn<UserGridRow> = (row, _columnId, value) => {
  const q = String(value ?? "").toLowerCase();
  if (!q) return true;
  const n = row.original.name?.toLowerCase() ?? "";
  const e = row.original.email.toLowerCase();
  const p = row.original.phone?.toLowerCase() ?? "";
  return n.includes(q) || e.includes(q) || p.includes(q);
};

export function EmployeesTablePage() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const { data, isFetching } = useQuery(trpc.users.listEmployees.queryOptions());

  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const rows = data?.rows ?? [];

  const columns = useMemo(
    () => buildUserGridColumns({ t, locale, setRowAction }),
    [t, locale],
  );

  const { table, globalFilter, setGlobalFilter } = useDataTable({
    mode: "client",
    data: rows,
    columns,
    getRowId: (r) => r.id,
    globalFilterFn: userGlobalFilter,
  });

  const closeRowAction = () => setRowAction(null);

  return (
    <div
      className={isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"}
    >
      <div className="space-y-1">
        <H2>{String(t("systemPages.employeesTitle"))}</H2>
        <Lead>{String(t("systemPages.employeesLead"))}</Lead>
      </div>
      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={globalFilter}
            onGlobalFilterChange={(v) => setGlobalFilter(v)}
            searchPlaceholder={String(t("dataTable.searchUsersHint"))}
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
                    aria-label={String(t("systemPages.addUser"))}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>{String(t("systemPages.addUser"))}</TooltipContent>
            </Tooltip>
            <DataTableViewOptions table={table} />
            <DataTableExportImport
              table={table}
              exportFileName="employees.csv"
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
              onImportParsed={() => undefined}
            />
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
        defaultRole="employee"
      />
      <UserFormDialog
        open={rowAction?.variant === "edit"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        user={rowAction?.variant === "edit" ? rowAction.row : null}
        defaultRole="employee"
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
