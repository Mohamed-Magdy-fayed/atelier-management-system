import type { FullBranch } from "@/features/core/auth/nextjs/actions";

export type BranchManagerVariant = "default" | "sidebar";
export type EditableBranch = Pick<
  FullBranch,
  "id" | "nameEn" | "nameAr" | "isCurrent"
>;
