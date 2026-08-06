"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useTRPC } from "@/integrations/trpc/client";

/**
 * The dashboard aggregates expenses, payments, reservations and dresses into a
 * single cached query, so a mutation on any of those must drop it — otherwise
 * the figures stay stale for `staleTime` (30s) or until a hard reload.
 */
export function useInvalidateDashboard() {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: trpc.dashboard.pathKey() }),
    [queryClient, trpc],
  );
}
