import type { ScreenKey } from "@/features/system/registry";

/** Primary destinations shown in the staff mobile bottom bar (fifth slot is "More"). */
export const SYSTEM_MOBILE_PRIMARY_SCREEN_KEYS = [
  "dashboard",
  "leads",
  "work",
  "blogPosts",
] as const satisfies readonly ScreenKey[];
