"use client";

import { useMemo } from "react";

import { useBranch } from "@/features/core/auth/nextjs/components/branch-provider";
import { useTranslation } from "@/features/core/i18n/client";

/**
 * Branch options for a form's branch `SelectField`.
 *
 * Branch-scoped forms used to read the active branch and block when there was
 * none (all-branches view). They now pick the branch per record instead, so the
 * admin never has to leave the form to switch branches. The branch list is
 * already in client context from `BranchProvider`, so this costs no fetch.
 */
export function useBranchFieldOptions() {
  const branchState = useBranch();
  const { locale } = useTranslation();

  const options = useMemo(
    () =>
      (branchState?.branches ?? []).map((branch) => ({
        value: branch.id,
        label: locale === "ar" ? branch.nameAr : branch.nameEn,
      })),
    [branchState?.branches, locale],
  );

  const activeBranchId = branchState?.hasActiveOrg
    ? branchState.activeBranch.id
    : undefined;

  // Employees assigned to a single branch should never face an empty select.
  const defaultBranchId =
    activeBranchId ?? (options.length === 1 ? (options[0]?.value ?? "") : "");

  return { options, activeBranchId, defaultBranchId };
}
