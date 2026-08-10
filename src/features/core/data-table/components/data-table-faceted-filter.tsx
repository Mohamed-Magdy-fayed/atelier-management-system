"use client";

import type { Column } from "@tanstack/react-table";
import { PlusCircleIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/features/core/i18n/client";

/** Above this many options the list gets a search box of its own. */
const SEARCHABLE_THRESHOLD = 8;

type DataTableFacetedFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>;
  title: string;
  options: { label: string; value: string }[];
  /**
   * How many rows each option would match, keyed by option value. Server-side
   * grids must pass this in: the table only holds the current page, so counting
   * client-side would report the page rather than the result set.
   */
  counts?: Record<string, number>;
  /** Force the search box on or off. Defaults to on past {@link SEARCHABLE_THRESHOLD}. */
  searchable?: boolean;
};

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  counts,
  searchable,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const { t, locale } = useTranslation();
  const [search, setSearch] = useState("");

  const showSearch = searchable ?? options.length > SEARCHABLE_THRESHOLD;

  const visibleOptions = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase(locale);
    if (!needle) return options;
    return options.filter((option) =>
      option.label.toLocaleLowerCase(locale).includes(needle),
    );
  }, [locale, options, search]);

  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale),
    [locale],
  );

  if (!column) return null;

  const raw = column.getFilterValue() as string[] | undefined;
  const selected = new Set(raw ?? []);

  /**
   * Client-mode tables can count their own rows; server-mode grids cannot, and
   * pass `counts` instead. Keys are stringified because option values are
   * strings even where the row value is a boolean.
   */
  const facetedValues = column.getFacetedUniqueValues?.();
  const countFor = (value: string): number | undefined => {
    // A missing key means the option matches nothing, not that the count is
    // unknown — show the zero rather than leaving the row bare.
    if (counts) return counts[value] ?? 0;
    if (!facetedValues) return undefined;
    for (const [key, rows] of facetedValues) {
      if (String(key) === value) return rows;
    }
    return undefined;
  };

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    const arr = [...next];
    column.setFilterValue(arr.length ? arr : undefined);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed px-2 text-xs"
          >
            <PlusCircleIcon className="size-3.5" />
            {title}
            {selected.size > 0 ? (
              <>
                <Separator orientation="vertical" className="mx-0.5 h-4" />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal lg:hidden"
                >
                  {selected.size}
                </Badge>
                <div className="hidden gap-1 lg:flex">
                  {selected.size > 2 ? (
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {String(
                        t("dataTable.selected", { count: selected.size }),
                      )}
                    </Badge>
                  ) : (
                    options
                      .filter((o) => selected.has(o.value))
                      .map((o) => (
                        <Badge
                          key={o.value}
                          variant="secondary"
                          className="max-w-40 truncate rounded-sm px-1 font-normal"
                        >
                          {o.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            ) : null}
          </Button>
        }
      />
      <PopoverContent className="w-64 p-0" align="start">
        {showSearch ? (
          <div className="border-b border-border p-2">
            <Input
              className="h-7 text-xs"
              placeholder={String(t("dataTable.searchOptions"))}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        ) : null}
        <ScrollArea className="max-h-[min(60dvh,16rem)]">
          <div className="flex flex-col gap-1 p-2">
            {visibleOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-muted-foreground text-xs">
                {String(t("common.noOptionsFound"))}
              </p>
            ) : (
              visibleOptions.map((opt) => {
                const is = selected.has(opt.value);
                const count = countFor(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border border-border accent-primary"
                      checked={is}
                      onChange={() => toggle(opt.value)}
                    />
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                    {count != null ? (
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {numberFormatter.format(count)}
                      </span>
                    ) : null}
                  </label>
                );
              })
            )}
          </div>
        </ScrollArea>
        {selected.size ? (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-center text-xs"
              type="button"
              onClick={() => column.setFilterValue(undefined)}
            >
              {String(t("dataTable.clearFilter", { title }))}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
