/** No legacy setting codes to migrate for the portfolio build. */
export function mapLegacySettingRow(_row: Record<string, unknown>): null {
  return null;
}

export function pickLegacyUsagePolicyValue(
  _rows: Array<{ code: string; value?: string | null }>,
): null {
  return null;
}
