/**
 * Overlap test for rental windows [receive, return] inclusive on both ends.
 * Used by staff mutations and the public availability checker.
 */
export function rentalWindowsOverlap(
  aReceive: Date,
  aReturn: Date,
  bReceive: Date,
  bReturn: Date,
): boolean {
  return (
    aReceive.getTime() <= bReturn.getTime() &&
    aReturn.getTime() >= bReceive.getTime()
  );
}
