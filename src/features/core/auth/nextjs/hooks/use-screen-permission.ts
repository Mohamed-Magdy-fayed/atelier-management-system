"use client";

import { useMemo } from "react";

import { canOnScreen } from "@/features/core/auth/core/permissions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import type { ScreenKey } from "@/features/system/registry";

export type ScreenPermission = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

const NO_ACCESS: ScreenPermission = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
};

/**
 * What the signed-in user may do on `screenKey`.
 *
 * Reads the same user object the sidebar filters on — `getAuth()` attaches
 * `screenPermissions` to it, so this needs no query of its own.
 *
 * Purely cosmetic: use it to hide affordances, never as the only guard. Every
 * mutation re-checks server-side via `assertScreenPermission`.
 */
export function useScreenPermission(screenKey: ScreenKey): ScreenPermission {
  const { session } = useAuth();
  const user = session?.user;

  return useMemo(() => {
    if (!user) return NO_ACCESS;
    return {
      canView: canOnScreen(user, screenKey, "view"),
      canCreate: canOnScreen(user, screenKey, "create"),
      canUpdate: canOnScreen(user, screenKey, "update"),
      canDelete: canOnScreen(user, screenKey, "delete"),
    };
  }, [user, screenKey]);
}
