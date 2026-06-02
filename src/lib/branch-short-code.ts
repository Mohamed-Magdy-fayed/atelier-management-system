export const BRANCH_SHORT_CODE_MIN_LENGTH = 2;
export const BRANCH_SHORT_CODE_MAX_LENGTH = 8;

export function normalizeBranchShortCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function isValidBranchShortCode(code: string): boolean {
  return (
    code.length >= BRANCH_SHORT_CODE_MIN_LENGTH &&
    code.length <= BRANCH_SHORT_CODE_MAX_LENGTH &&
    /^[A-Z0-9]+$/.test(code)
  );
}
