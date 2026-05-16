import {
  BRANCH_SHORT_CODE_MAX_LENGTH,
  BRANCH_SHORT_CODE_MIN_LENGTH,
  isValidBranchShortCode,
  normalizeBranchShortCode,
} from "@/lib/branch-short-code";

/** Defaults for target branch columns not present in legacy `branches`. */
export const LEGACY_BRANCH_PLACEHOLDERS = {
  addressEn: "Address pending migration",
  addressAr: "العنوان يُحدَّث لاحقاً",
  phone: "00000000000",
  opensAt: "10:00:00",
  closesAt: "22:00:00",
  mapUrl: null as string | null,
} as const;

function sanitizeShortCodeBase(raw: string): string {
  let code = normalizeBranchShortCode(raw);
  if (code.length < BRANCH_SHORT_CODE_MIN_LENGTH) {
    code = `${code}X`.slice(0, BRANCH_SHORT_CODE_MAX_LENGTH);
  }
  if (code.length > BRANCH_SHORT_CODE_MAX_LENGTH) {
    code = code.slice(0, BRANCH_SHORT_CODE_MAX_LENGTH);
  }
  if (!isValidBranchShortCode(code)) {
    return "BR01";
  }
  return code;
}

function tryAllocateShortCode(
  base: string,
  usedCodes: Set<string>,
): string | null {
  const claim = (code: string) => {
    if (!isValidBranchShortCode(code) || usedCodes.has(code)) return null;
    usedCodes.add(code);
    return code;
  };

  const direct = claim(base);
  if (direct) return direct;

  for (let i = 2; i <= 99; i++) {
    const suffix = String(i);
    const trimmed = base.slice(0, BRANCH_SHORT_CODE_MAX_LENGTH - suffix.length);
    const candidate = claim(`${trimmed}${suffix}`);
    if (candidate) return candidate;
  }

  return null;
}

/** Map legacy `branches.code` (or name / id) to a unique target `shortCode`. */
export function resolveLegacyBranchShortCode(opts: {
  legacyCode: string;
  legacyName: string;
  branchId: string;
  usedCodes: Set<string>;
}): string {
  const { legacyCode, legacyName, branchId, usedCodes } = opts;

  const candidates = [
    legacyCode.trim() ? sanitizeShortCodeBase(legacyCode) : "",
    sanitizeShortCodeBase(
      legacyName.replace(/[^A-Za-z0-9]/g, "").slice(0, 4) || "BR",
    ),
    sanitizeShortCodeBase(`B${branchId.replace(/-/g, "").slice(0, 7)}`),
  ].filter(Boolean);

  for (const base of candidates) {
    const allocated = tryAllocateShortCode(base, usedCodes);
    if (allocated) return allocated;
  }

  throw new Error(
    `Could not allocate unique branch short code for branch ${branchId}`,
  );
}
