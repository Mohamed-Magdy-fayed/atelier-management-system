import type { Column } from "@tanstack/react-table";
import type { CSSProperties } from "react";

const pinShadow = (side: "left" | "right", isLast: boolean): string => {
  if (!isLast) return "none";
  return side === "left"
    ? "4px 0 8px -4px hsl(var(--border) / 0.6) inset"
    : "-4px 0 8px -4px hsl(var(--border) / 0.6) inset";
};

/** Sticky styles for TanStack column pinning (`left` / `right` pin sides). */
export function getPinningStyles<T>(column: Column<T>): CSSProperties {
  const isPinned = column.getIsPinned();
  const isLastLeft = isPinned === "left" && column.getIsLastColumn("left");
  const isFirstRight = isPinned === "right" && column.getIsFirstColumn("right");
  return {
    boxShadow:
      isPinned === "left"
        ? pinShadow("left", isLastLeft)
        : isPinned === "right"
          ? pinShadow("right", isFirstRight)
          : undefined,
    left: isPinned === "left" ? `${column.getStart("left")}px` : undefined,
    right: isPinned === "right" ? `${column.getAfter("right")}px` : undefined,
    opacity: 1,
    position: isPinned ? "sticky" : "relative",
    width: column.getSize(),
    zIndex: isPinned ? 1 : 0,
    background: "hsl(var(--background))",
  };
}
