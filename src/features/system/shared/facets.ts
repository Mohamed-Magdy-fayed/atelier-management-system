/**
 * Row counts per option for a grid's select-list filters.
 *
 * Keyed by the table column id the filter is bound to, then by option value.
 * The grids are server-paginated, so these have to be computed in SQL — the
 * client only ever holds one page and would report counts for that page.
 */
export type GridFacetCounts = Record<string, Record<string, number>>;

type FacetRow = { key: unknown; value: unknown };

/** Turns a `GROUP BY` result into the `{ optionValue: count }` shape. */
export function toFacetCounts(rows: FacetRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.key === null || row.key === undefined) continue;
    counts[String(row.key)] = Number(row.value ?? 0);
  }
  return counts;
}

/**
 * The filters to apply when counting one facet's options: everything the user
 * has chosen except that facet's own selection. Counting with it applied would
 * zero out every option the user has not picked, which reads as "there is
 * nothing else to choose".
 */
export function columnFiltersExcept(
  columnFilters: { id: string; value: unknown }[],
  columnId: string,
): { id: string; value: unknown }[] {
  return columnFilters.filter((filter) => filter.id !== columnId);
}
