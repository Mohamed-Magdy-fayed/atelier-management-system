"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PublicBranchSelect } from "@/features/public-catalog/components/public-branch-select";
import {
  getPublicDressSortOptions,
  normalizePublicDressSort,
  type PublicDressSort,
} from "@/features/public-catalog/lib/public-dress-sort";

import type { PublicBranchOption } from "./public-branch-select";

const DEFAULT_SORT: PublicDressSort = "popularity";

export function PublicCatalogFilters({
  branches,
  branchId,
  search,
  sort: sortProp,
  hidePrices = false,
  labels,
}: {
  branches: PublicBranchOption[];
  branchId?: string;
  search?: string;
  sort?: string;
  hidePrices?: boolean;
  labels: {
    searchPlaceholder: string;
    filterBranch: string;
    filterBranchAll: string;
    sortBy: string;
    sortPopularity: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortTitleAsc: string;
    sortNewest: string;
    applyFilters: string;
    clear: string;
  };
}) {
  const router = useRouter();
  const sortOptions = getPublicDressSortOptions(hidePrices);
  const [branch, setBranch] = useState(branchId);
  const [query, setQuery] = useState(search ?? "");
  const [sort, setSort] = useState<PublicDressSort>(() =>
    normalizePublicDressSort(sortProp, { hidePrices }),
  );

  useEffect(() => {
    setBranch(branchId);
    setQuery(search ?? "");
    setSort(normalizePublicDressSort(sortProp, { hidePrices }));
  }, [branchId, hidePrices, search, sortProp]);

  function buildHref(next: {
    branchId?: string;
    search?: string;
    sort?: PublicDressSort;
    page?: string;
  }) {
    const p = new URLSearchParams();
    const merged = {
      branchId: branch,
      search: query.trim() || undefined,
      sort,
      ...next,
    };
    if (merged.branchId) p.set("branchId", merged.branchId);
    if (merged.search) p.set("search", merged.search);
    if (merged.sort && merged.sort !== DEFAULT_SORT) p.set("sort", merged.sort);
    if (merged.page && merged.page !== "1") p.set("page", merged.page);
    const q = p.toString();
    return q ? `/browse?${q}` : "/browse";
  }

  function apply() {
    router.push(buildHref({ page: "1" }));
  }

  function clear() {
    setBranch(undefined);
    setQuery("");
    setSort(DEFAULT_SORT);
    router.push("/browse");
  }

  const sortLabelMap: Record<PublicDressSort, string> = {
    popularity: labels.sortPopularity,
    priceAsc: labels.sortPriceAsc,
    priceDesc: labels.sortPriceDesc,
    titleAsc: labels.sortTitleAsc,
    newest: labels.sortNewest,
  };

  return (
    <form
      className="mb-10 flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/25 p-4 lg:flex-row lg:flex-wrap lg:items-end lg:gap-x-6 lg:gap-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:max-w-sm">
        <label className="sr-only" htmlFor="pub-search">
          {labels.searchPlaceholder}
        </label>
        <input
          className="border-border bg-background h-10 rounded-md border px-3 text-sm outline-none ring-ring/40 focus-visible:ring-2"
          id="pub-search"
          onChange={(e) => setQuery(e.target.value)}
          placeholder={labels.searchPlaceholder}
          type="search"
          value={query}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 md:w-56">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {labels.filterBranch}
        </span>
        <PublicBranchSelect
          allLabel={labels.filterBranchAll}
          branches={branches}
          id="pub-branch"
          onValueChange={setBranch}
          value={branch}
        />
      </div>
      <div className="flex min-w-0 flex-col gap-2 md:w-64">
        <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          {labels.sortBy}
        </span>
        <Select
          value={sort}
          onValueChange={(v) => setSort(v as PublicDressSort)}
        >
          <SelectTrigger className="w-full" id="pub-sort">
            <SelectValue>
              {(val) => sortLabelMap[val as PublicDressSort]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((key) => (
              <SelectItem key={key} value={key}>
                {sortLabelMap[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2 lg:ms-auto">
        <Button type="submit" variant="default">
          {labels.applyFilters}
        </Button>
        <Button onClick={clear} type="button" variant="ghost">
          {labels.clear}
        </Button>
      </div>
    </form>
  );
}
