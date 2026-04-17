"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { getBranches } from "@/features/core/auth/nextjs/actions";

type BranchContextValue = Awaited<ReturnType<typeof getBranches>>;

const BranchContext = createContext<BranchContextValue | null>(null);
type BranchProviderProps = { value: BranchContextValue | null; children: ReactNode };

export function BranchProvider({ value, children }: BranchProviderProps) {
	return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
	const context = useContext(BranchContext);
	if (context == null) {
		throw new Error("useBranch must be used within an BranchProvider");
	}
	return context;
}
