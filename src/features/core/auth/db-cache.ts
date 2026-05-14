import { updateTag } from "next/cache";
import { getBranchTag, getGlobalTag, getUserTag } from "@/lib/data-cache";

export function getUserGlobalTag() {
  return getGlobalTag("users");
}

export function getUserIdTag(id: string) {
  return getUserTag("users", id);
}

export function getBranchIdTag(id: string) {
  return getBranchTag("branches", id);
}

export function revalidateAuthCache({
  id,
  branchId,
}: {
  id: string;
  branchId?: string;
}) {
  updateTag(getUserGlobalTag());
  updateTag(getUserIdTag(id));
  if (branchId) {
    updateTag(getBranchIdTag(branchId));
  }
}
