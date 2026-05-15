"use client";

import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";

/** Active branch id, or `undefined` when admin selected “all branches” (legacy `getBranchSelection().mode === "all"`). */
export function useActiveBranchId() {
  const branchState = useBranch();
  if (!branchState?.hasActiveOrg) {
    return undefined;
  }
  return branchState.activeBranch.id;
}
