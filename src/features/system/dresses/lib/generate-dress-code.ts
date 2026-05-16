/** Matches legacy dress-rental-system format: PREFIX + random alphanumeric segment. */
export function generateDressCode(prefix = "DRS", length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";

  for (let i = 0; i < length; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${prefix}-${randomPart}`;
}
