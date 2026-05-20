export const PUBLIC_DRESS_SORT_VALUES = [
  "popularity",
  "priceAsc",
  "priceDesc",
  "titleAsc",
  "newest",
] as const;

export type PublicDressSort = (typeof PUBLIC_DRESS_SORT_VALUES)[number];

const PUBLIC_PRICE_SORTS = new Set<PublicDressSort>(["priceAsc", "priceDesc"]);

export function isPublicPriceSort(sort: PublicDressSort): boolean {
  return PUBLIC_PRICE_SORTS.has(sort);
}

export function getPublicDressSortOptions(
  hidePrices = false,
): readonly PublicDressSort[] {
  if (!hidePrices) return PUBLIC_DRESS_SORT_VALUES;
  return PUBLIC_DRESS_SORT_VALUES.filter((s) => !isPublicPriceSort(s));
}

export function normalizePublicDressSort(
  value: string | null | undefined,
  options?: { hidePrices?: boolean },
): PublicDressSort {
  const v = value?.trim();
  let sort: PublicDressSort = "popularity";
  if (v && (PUBLIC_DRESS_SORT_VALUES as readonly string[]).includes(v)) {
    sort = v as PublicDressSort;
  }
  if (options?.hidePrices && isPublicPriceSort(sort)) {
    return "popularity";
  }
  return sort;
}
