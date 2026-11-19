"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient } from "@trpc/client";
import { type ReactNode, useMemo, useState, useSyncExternalStore } from "react";
import { AuthProvider } from "@/features/core/auth/nextjs/components/auth-provider";
import { BranchProvider } from "@/features/core/auth/nextjs/components/branch-provider";
import type {
  AuthState,
  AuthUser,
  BranchState,
} from "@/features/core/auth/types";
import { TRPCProvider } from "@/integrations/trpc/client";
import { makeQueryClient } from "@/integrations/trpc/query-client";
import type { AppRouter } from "@/integrations/trpc/routers/_app";

import { sandboxLink } from "../link";
import {
  getSandboxState,
  getServerSandboxState,
  SANDBOX_OWNER,
  subscribeSandboxState,
} from "../state";

const EPOCH = new Date("2026-01-01T09:00:00.000Z");

const SANDBOX_USER: AuthUser = {
  id: SANDBOX_OWNER.id,
  email: SANDBOX_OWNER.email,
  name: SANDBOX_OWNER.name,
  phone: null,
  imageUrl: null,
  role: "admin",
  emailVerifiedAt: EPOCH,
  lastSignInAt: EPOCH,
  age: null,
  createdAt: EPOCH,
  createdBy: SANDBOX_OWNER.id,
  updatedAt: null,
  updatedBy: null,
  deletedAt: null,
  deletedBy: null,
  screenPermissions: null,
};

const SANDBOX_AUTH: AuthState = {
  isAuthenticated: true,
  session: { user: SANDBOX_USER, hasPassword: true },
};

/**
 * Re-provides the contexts the real screens read, backed by the browser store.
 *
 * Nested inside the app's own providers, so every screen below resolves auth,
 * branches and tRPC from here instead of from the server.
 */
export function SandboxProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({ links: [sandboxLink] }),
  );

  const state = useSyncExternalStore(
    subscribeSandboxState,
    getSandboxState,
    getServerSandboxState,
  );

  const branchState = useMemo<BranchState>(
    () => ({
      hasActiveOrg: false,
      activeBranch: undefined,
      canViewAllBranches: true,
      branches: state.branches.map((branch) => ({
        id: branch.id,
        shortCode: branch.shortCode,
        nameEn: branch.nameEn,
        nameAr: branch.nameAr,
        ownerId: SANDBOX_OWNER.id,
        isCurrent: false,
      })),
    }),
    [state.branches],
  );

  return (
    <AuthProvider value={SANDBOX_AUTH}>
      <BranchProvider value={branchState}>
        <QueryClientProvider client={queryClient}>
          <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
            {children}
          </TRPCProvider>
        </QueryClientProvider>
      </BranchProvider>
    </AuthProvider>
  );
}

export { SANDBOX_USER };
