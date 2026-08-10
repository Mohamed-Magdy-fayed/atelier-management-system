"use client";

import { useQuery } from "@tanstack/react-query";
import type { FilterFn, Table } from "@tanstack/react-table";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

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
  DataTableExportButton,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  useDataTable,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { ImportButton } from "@/features/system/import/admin";
import { useTRPC } from "@/integrations/trpc/client";
import type {
  EmployeeGridRow,
  UserGridRow,
} from "@/integrations/trpc/routers/users";

import { UserDeleteDialog } from "./components/user-delete-dialog";
import { UserFormDialog } from "./components/user-form-dialog";
import { UserInfoModal } from "./components/user-info-modal";
import type { UserRowActionVariant } from "./components/user-row-actions";
import {
  buildEmployeeGridColumns,
  EmployeesGridFilters,
} from "./components";
import { UsersBulkActions } from "./components/users-bulk-actions";

type RowAction = { row: UserGridRow; variant: UserRowActionVariant } | null;

const userGlobalFilter: FilterFn<EmployeeGridRow> = (row, _columnId, value) => {
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
  const branchState = useBranch();
  const branchId = branchState?.hasActiveOrg
    ? branchState.activeBranch.id
    : undefined;
  const addEmployeeLabel = `${t("common.add")} ${t("systemPages.roleEmployee")}`;

  const { data: assignableBranches } = useQuery(
    trpc.users.listAssignableBranches.queryOptions(),
  );

  const branchFilterOptions = useMemo(
    () =>
      (assignableBranches ?? []).map((branch) => ({
        value: branch.id,
        label: locale === "ar" ? branch.nameAr : branch.nameEn,
      })),
    [assignableBranches, locale],
  );

  const { data, isFetching } = useQuery(
    trpc.users.listEmployees.queryOptions({}),
  );

  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const rows = data?.rows ?? [];

  const columns = useMemo(
    () =>
      buildEmployeeGridColumns({
        t,
        locale,
        setRowAction,
        branchFilterOptions,
      }),
    [branchFilterOptions, locale, setRowAction, t],
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
      className={
        isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
      }
    >
      <EntityPageHeader slug="employees" />
      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={globalFilter}
            onGlobalFilterChange={(v) => setGlobalFilter(v)}
            searchPlaceholder={t("dataTable.searchUsersHint")}
            filterSlot={
              <EmployeesGridFilters
                table={table}
                branchFilterOptions={branchFilterOptions}
              />
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
                    aria-label={addEmployeeLabel}
                  >
                    <PlusIcon className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent>{addEmployeeLabel}</TooltipContent>
            </Tooltip>
            <DataTableViewOptions table={table} />
            <DataTableExportButton
              table={table}
              exportFileName="employees.csv"
              getExportRow={(row) => ({
                id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone,
                role: row.role,
                hasPassword: row.hasPassword ? "true" : "false",
                branches: row.branches
                  .map((branch) =>
                    locale === "ar" ? branch.nameAr : branch.nameEn,
                  )
                  .join(", "),
                age: row.age,
                verified: row.emailVerifiedAt ? "true" : "false",
                emailVerifiedAt: row.emailVerifiedAt,
                lastSignInAt: row.lastSignInAt,
                createdAt: row.createdAt,
              })}
            />
            <ImportButton entitySlug="employees" />
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
        actionBar={
          <DataTableActionBar table={table}>
            <UsersBulkActions table={table as unknown as Table<UserGridRow>} />
          </DataTableActionBar>
        }
      />

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultRole="employee"
        branchId={branchId}
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
