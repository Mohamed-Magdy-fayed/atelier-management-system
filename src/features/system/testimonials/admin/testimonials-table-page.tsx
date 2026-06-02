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
import type { Testimonial } from "@/integrations/trpc/routers/testimonials";

import {
  buildTestimonialColumns,
  TestimonialDeleteDialog,
  TestimonialFormDialog,
  TestimonialInfoModal,
  type TestimonialRowActionVariant,
} from "./components";

type RowAction = {
  row: Testimonial;
  variant: TestimonialRowActionVariant;
} | null;

export function TestimonialsTablePage() {
  const trpc = useTRPC();
  const { t, locale } = useTranslation();
  const addLabel = `${t("common.add")} ${t("systemPages.testimonialsTitle")}`;

  const [rowAction, setRowAction] = useState<RowAction>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rows = [], isFetching } = useQuery(
    trpc.testimonials.list.queryOptions(),
  );

  const columns = useMemo(
    () => buildTestimonialColumns({ t, locale, setRowAction }),
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
      <EntityPageHeader slug="testimonials" />
      <DataTable
        table={table}
        toolbar={
          <DataTableToolbar
            table={table}
            globalFilter={globalFilter}
            onGlobalFilterChange={(v) => setGlobalFilter(v)}
            searchPlaceholder={String(t("dataTable.searchTestimonialsHint"))}
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
      <TestimonialFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TestimonialFormDialog
        open={rowAction?.variant === "edit"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        testimonial={rowAction?.variant === "edit" ? rowAction.row : null}
      />
      <TestimonialInfoModal
        open={rowAction?.variant === "info"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        testimonial={rowAction?.variant === "info" ? rowAction.row : null}
      />
      <TestimonialDeleteDialog
        open={rowAction?.variant === "delete"}
        onOpenChange={(open) => {
          if (!open) closeRowAction();
        }}
        testimonial={rowAction?.variant === "delete" ? rowAction.row : null}
        onDeleted={closeRowAction}
      />
    </div>
  );
}
