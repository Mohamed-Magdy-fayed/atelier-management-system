/**
 * Sort every admin grid starts on: newest first.
 *
 * Lives outside the `"use client"` hook so the route files can prefetch with
 * the exact same sorting the client mounts with. If the two disagree the
 * prefetched cache entry is keyed differently, the hydrated table misses it,
 * and the page flashes a loading state before showing rows it already had.
 *
 * Entities whose `sortExpr` has no `createdAt` case fall back to their own
 * server-side default, so this is safe to apply to every grid.
 */
export const DEFAULT_TABLE_SORTING: readonly { id: string; desc: boolean }[] = [
  { id: "createdAt", desc: true },
];
