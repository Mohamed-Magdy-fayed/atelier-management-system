"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { FilterIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/features/core/i18n/client";
import { useIsMobile } from "@/hooks/use-mobile";

type DataTableToolbarProps<T> = {
  table: TanstackTable<T>;
  globalFilter: string;
  onGlobalFilterChange: (value: string) => void;
  /** Overrides the default search placeholder */
  searchPlaceholder?: string;
  /** Right-side tools (view options, export, import, add new…) */
  children?: ReactNode;
  /**
   * Filter triggers rendered as a fragment of side-by-side controls.
   * On `md+` they appear inline next to the search input; on smaller
   * screens they collapse into a single "Filters" popover that stacks
   * the same controls vertically.
   */
  filterSlot?: ReactNode;
};

export function DataTableToolbar<T>({
  table,
  globalFilter,
  onGlobalFilterChange,
  searchPlaceholder,
  children,
  filterSlot,
}: DataTableToolbarProps<T>) {
  const { t } = useTranslation();
  // Inline filters only show on roomy screens (>= xl). Below that there's not
  // enough horizontal space for search + multiple filter triggers + reset, so
  // we collapse them all into the "Filters" popover.
  const collapseFilters = useIsMobile(1280);
  const placeholder = searchPlaceholder ?? String(t("dataTable.searchRows"));

  const activeColumnFilterCount = table.getState().columnFilters.length;
  // The text filter counts toward "active" too — that's why the search input
  // lives alongside the column filter triggers (and inside the mobile popover).
  const activeFilterCount =
    activeColumnFilterCount + (globalFilter ? 1 : 0);
  const isFiltered = activeFilterCount > 0;

  const searchInput = (
    <Input
      className="h-8 w-full min-w-0 max-w-full sm:w-[18rem]"
      placeholder={placeholder}
      value={globalFilter}
      onChange={(e) => onGlobalFilterChange(e.target.value)}
    />
  );

  const resetButton = isFiltered ? (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="h-8 border-dashed px-2 text-xs"
      onClick={() => {
        table.resetColumnFilters();
        onGlobalFilterChange("");
      }}
    >
      {String(t("dataTable.reset"))}
      <XIcon className="ms-1 size-3.5" />
    </Button>
  ) : null;

  return (
    <div className="flex w-full min-w-0 items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        {collapseFilters ? (
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="h-8 border-dashed px-2 text-xs"
                >
                  <FilterIcon className="size-3.5" />
                  {String(t("dataTable.filters"))}
                  {activeFilterCount > 0 ? (
                    <Badge
                      variant="secondary"
                      className="ms-1 rounded-sm px-1 font-normal"
                    >
                      {activeFilterCount}
                    </Badge>
                  ) : null}
                </Button>
              }
            />
            {/*
              On mobile the search input and the filter controls stack inside
              the same popover. `*:w-full` targets the direct trigger button
              of each filter (each filter's outer wrapper is a non-render
              Popover.Root) and the Input. `*:justify-start` keeps icons +
              labels aligned.
            */}
            <PopoverContent
              align="start"
              className="w-72 max-w-[calc(100vw-2rem)] gap-2 p-2"
            >
              <div className="flex flex-col gap-2 *:w-full *:justify-start">
                {searchInput}
                {filterSlot}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <>
            {searchInput}
            {filterSlot}
          </>
        )}

        {resetButton}
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-1">{children}</div>
      ) : null}
    </div>
  );
}
