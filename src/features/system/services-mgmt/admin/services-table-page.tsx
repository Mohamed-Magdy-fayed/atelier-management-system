"use client";

import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DataTable,
  DataTablePagination,
  DataTableToolbar,
  DataTableViewOptions,
  EntityPageHeader,
  useDataTable,
} from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { Service } from "@/integrations/trpc/routers/services-mgmt";

import {
  buildServiceColumns,
  ServiceDeleteDialog,
  ServiceFormDialog,
  ServiceInfoModal,
  type ServiceRowActionVariant,
} from "./components";

type RowAction = { row: Service; variant: ServiceRowActionVariant } | null;

export function ServicesTablePage() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const addLabel = `${t("common.add")} ${t("systemPages.servicesTitle")}`;

  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rows = [], isFetching } = useQuery(
    trpc.servicesMgmt.list.queryOptions(),
  );

  const columns = useMemo(
    () => buildServiceColumns({ t, locale, setRowAction }),
    [t, locale],
  );

  const { table, globalFilter, setGlobalFilter } = useDataTable({
    mode: "client",
    data: rows,
    columns,
    getRowId: (r) => r.id,
  });

  const closeRowAction = () => setRowAction(null);

  return (
    <div
      className={
        isFetching ? "space-y-4 opacity-80 transition-opacity" : "space-y-4"
      }
    >
      <EntityPageHeader slug="services" />
      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={globalFilter}
            onGlobalFilterChange={(v) => setGlobalFilter(v)}
            searchPlaceholder={String(t("dataTable.searchServicesHint"))}
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
          </DataTableToolbar>
        }
        footer={<DataTablePagination table={table} />}
      />
      <ServiceFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <ServiceFormDialog
        open={rowAction?.variant === "edit"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        service={rowAction?.variant === "edit" ? rowAction.row : null}
      />
      <ServiceInfoModal
        open={rowAction?.variant === "info"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        service={rowAction?.variant === "info" ? rowAction.row : null}
      />
      <ServiceDeleteDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        service={rowAction?.variant === "delete" ? rowAction.row : null}
        onDeleted={closeRowAction}
      />
    </div>
  );
}
