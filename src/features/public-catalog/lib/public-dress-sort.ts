export const PUBLIC_DRESS_SORT_VALUES = [
  "popularity",
  "priceAsc",
  "priceDesc",
  "titleAsc",
  "newest",
] as const;

export type PublicDressSort = (typeof PUBLIC_DRESS_SORT_VALUES)[number];

export function normalizePublicDressSort(
  value: string | null | undefined,
): PublicDressSort {
  const v = value?.trim();
  if (v && (PUBLIC_DRESS_SORT_VALUES as readonly string[]).includes(v)) {
    return v as PublicDressSort;
  }
  return "popularity";
}
