"use server";

import {
    and,
    desc,
    eq,
    inArray,
} from "drizzle-orm";
import { cacheTag } from "next/cache";
import { z } from "zod";

import { db } from "@/drizzle";
import {
    type Branch,
    BranchesTable,
    BranchMembershipsTable,
} from "@/drizzle/schema";
import { authError, hasPermission } from "@/features/core/auth/core";
import { getUserIdTag, revalidateAuthCache } from "@/features/core/auth/db-cache";
import { validateInput } from "@/features/core/auth/nextjs/actions/helpers";
import { getCurrentUser } from "@/features/core/auth/nextjs/currentUser";
import {
    createBranchSchema,
    updateBranchSchema,
} from "@/features/core/auth/schemas";
import type { BranchState, TypedResponse } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/server";

const upsertBranchesInputSchema = z.object({
    userId: z.uuid(),
    branchIds: z.array(z.uuid()),
});

export async function createBranchAction(
    rawInput: z.infer<typeof createBranchSchema>,
): Promise<TypedResponse<{ branchId: string }>> {
    const { t } = await getT();
    const actor = await getCurrentUser({ redirectIfNotFound: true });

    if (!hasPermission(actor, "branches", "create")) {
        return {
            isError: true,
            message: t("authTranslations.unauthorized", {
                action: "create",
                resource: "branches",
            }),
        };
    }

    const { nameAr, nameEn } = await validateInput(createBranchSchema, rawInput);
    const trimmedEn = nameEn.trim();
    const trimmedAr = nameAr.trim();

    const branchId = await db.transaction(async (trx) => {
        const branch = await trx
            .insert(BranchesTable)
            .values({ nameEn: trimmedEn, nameAr: trimmedAr, ownerId: actor.id })
            .returning({ id: BranchesTable.id })
            .then((res) => res[0]);

        await trx
            .insert(BranchMembershipsTable)
            .values({
                isCurrent: false,
                branchId: branch.id,
                userId: actor.id,
            })
            .onConflictDoNothing();

        return branch.id;
    });

    revalidateAuthCache({ id: actor.id, branchId });

    return { isError: false, branchId };
}

export async function updateBranchAction(
    rawInput: z.infer<typeof updateBranchSchema>,
): Promise<TypedResponse<{ updated: true }>> {
    const { t } = await getT();
    const { branchId, nameAr, nameEn } = await validateInput(
        updateBranchSchema,
        rawInput,
    );
    const actor = await getCurrentUser({
        redirectIfNotFound: true,
    });

    if (!hasPermission(actor, "branches", "update")) {
        return {
            isError: true,
            message: t("authTranslations.unauthorized", {
                action: "update",
                resource: "branches",
            }),
        };
    }

    const branch = await db.query.BranchesTable.findFirst({
        columns: { id: true },
        where: eq(BranchesTable.id, branchId),
    });

    if (!branch) {
        return {
            isError: true,
            message: t("authTranslations.branch.actions.updateBranch.notFound"),
        };
    }

    await db
        .update(BranchesTable)
        .set({
            nameEn: nameEn.trim(),
            nameAr: nameAr.trim(),
        })
        .where(eq(BranchesTable.id, branchId));

    revalidateAuthCache({ id: actor.id, branchId });

    return { isError: false, updated: true };
}

export async function deleteBranchAction(
    rawInput: string,
): Promise<TypedResponse<{ deleted: true }>> {
    const { t } = await getT();
    const branchId = await validateInput(z.uuid(), rawInput);
    const actor = await getCurrentUser({
        redirectIfNotFound: true,
    });

    if (!hasPermission(actor, "branches", "delete")) {
        return {
            isError: true,
            message: t("authTranslations.unauthorized", {
                action: "delete",
                resource: "branches",
            }),
        };
    }

    const branch = await db.query.BranchesTable.findFirst({
        columns: { id: true },
        where: eq(BranchesTable.id, branchId),
    });

    if (!branch) {
        return {
            isError: true,
            message: t("authTranslations.branch.actions.deleteBranch.notFound"),
        };
    }
    await db.delete(BranchesTable).where(eq(BranchesTable.id, branchId));

    revalidateAuthCache({ id: actor.id, branchId });

    return { isError: false, deleted: true };
}

export async function upsertUserBranchesAction(
    rawInput: z.infer<typeof upsertBranchesInputSchema>,
): Promise<TypedResponse<{ updated: true }>> {
    const { t } = await getT();
    const actor = await getCurrentUser({ redirectIfNotFound: true });

    if (!hasPermission(actor, "branches", "update")) {
        return {
            isError: true,
            message: t("authTranslations.unauthorized", {
                action: "update",
                resource: "branches",
            }),
        };
    }

    const { userId, branchIds: branchs } = await validateInput(
        upsertBranchesInputSchema,
        rawInput,
    );
    const branchIds = Array.from(new Set(branchs));

    const existing = await db
        .select({ branchId: BranchMembershipsTable.branchId })
        .from(BranchMembershipsTable)
        .where(eq(BranchMembershipsTable.userId, userId));

    const existingIds = existing.map((row) => row.branchId);
    const toAdd = branchIds.filter((id) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id) => !branchIds.includes(id));

    if (toAdd.length > 0) {
        await db.insert(BranchMembershipsTable).values(
            toAdd.map((branchId) => ({
                branchId: branchId,
                userId,
            })),
        );
    }

    if (toRemove.length > 0) {
        await db
            .delete(BranchMembershipsTable)
            .where(
                and(
                    eq(BranchMembershipsTable.userId, userId),
                    inArray(BranchMembershipsTable.branchId, toRemove),
                ),
            );
    }

    return { isError: false, updated: true };
}

export type FullBranch = Pick<Branch, "id" | "nameEn" | "nameAr" | "ownerId"> & { isCurrent: boolean | null };
export async function listBranchesForUserAction(): Promise<Array<FullBranch>> {
    const actor = await getCurrentUser({ redirectIfNotFound: true });

    return getBranchesByUserId(actor.id, actor.role === "admin");
}

export async function getBranchesByUserId(
    userId: string,
    includeAllBranches = false,
): Promise<Array<FullBranch>> {
    "use cache";
    cacheTag(getUserIdTag(userId));

    if (includeAllBranches) {
        const allBranches = await db
            .select({
                id: BranchesTable.id,
                nameEn: BranchesTable.nameEn,
                nameAr: BranchesTable.nameAr,
                ownerId: BranchesTable.ownerId,
                isCurrent: BranchMembershipsTable.isCurrent,
            })
            .from(BranchesTable)
            .leftJoin(
                BranchMembershipsTable,
                and(
                    eq(BranchMembershipsTable.branchId, BranchesTable.id),
                    eq(BranchMembershipsTable.userId, userId),
                ),
            )
            .orderBy(desc(BranchesTable.createdAt));

        return allBranches.map((branch) => ({
            id: branch.id,
            nameEn: branch.nameEn,
            nameAr: branch.nameAr,
            ownerId: branch.ownerId,
            isCurrent: branch.isCurrent,
        }));
    }

    const memberships = await db.query.BranchMembershipsTable.findMany({
        where: eq(BranchMembershipsTable.userId, userId),
        orderBy: [desc(BranchMembershipsTable.createdAt)],
        with: {
            branch: {
                columns: { id: true, nameEn: true, nameAr: true, ownerId: true },
            },
        },
        columns: { isCurrent: true },
    });

    return memberships.map((m) => ({
        id: m.branch.id,
        nameEn: m.branch.nameEn,
        nameAr: m.branch.nameAr,
        ownerId: m.branch.ownerId,
        isCurrent: m.isCurrent,
    }));
}

export async function setActiveBranchForUserAction(
    branchId: string,
): Promise<TypedResponse<{ updated: true }>> {
    const { t } = await getT();
    const actor = await getCurrentUser({ redirectIfNotFound: true });
    const userId = actor.id;

    if (actor.role === "customer") {
        return {
            isError: true,
            message: t("authTranslations.unauthorized", {
                action: "update",
                resource: "branches",
            }),
        };
    }

    try {
        await db.transaction(async (trx) => {
            const membership = await trx.query.BranchMembershipsTable.findFirst({
                where: and(
                    eq(BranchMembershipsTable.userId, userId),
                    eq(BranchMembershipsTable.branchId, branchId),
                ),
                columns: { branchId: true, userId: true },
            });

            if (!membership && actor.role !== "admin") {
                throw new Error("BRANCH_ACCESS_DENIED");
            }

            if (!membership && actor.role === "admin") {
                const branch = await trx.query.BranchesTable.findFirst({
                    where: eq(BranchesTable.id, branchId),
                    columns: { id: true },
                });

                if (!branch) {
                    throw new Error("BRANCH_NOT_FOUND");
                }

                await trx.insert(BranchMembershipsTable).values({
                    branchId,
                    userId,
                    isCurrent: true,
                });
            }

            await trx
                .update(BranchMembershipsTable)
                .set({ isCurrent: false })
                .where(eq(BranchMembershipsTable.userId, userId));
            await trx
                .update(BranchMembershipsTable)
                .set({ isCurrent: true })
                .where(
                    and(
                        eq(BranchMembershipsTable.userId, userId),
                        eq(BranchMembershipsTable.branchId, branchId),
                    ),
                );
        });

        revalidateAuthCache({ id: userId, branchId });

        return { isError: false, updated: true };
    } catch (error) {
        if (error instanceof Error && error.message === "BRANCH_ACCESS_DENIED") {
            return {
                isError: true,
                message: t("authTranslations.branch.actions.common.noOrgAccess"),
            };
        }

        if (error instanceof Error && error.message === "BRANCH_NOT_FOUND") {
            return {
                isError: true,
                message: t("authTranslations.branch.actions.updateBranch.notFound"),
            };
        }

        return authError(error);
    }
}

export async function clearActiveBranchForUserAction(): Promise<
    TypedResponse<{ updated: true }>
> {
    const { t } = await getT();
    const actor = await getCurrentUser({ redirectIfNotFound: true });
    const userId = actor.id;

    if (actor.role === "customer") {
        return {
            isError: true,
            message: t("authTranslations.unauthorized", {
                action: "update",
                resource: "branches",
            }),
        };
    }

    try {
        await db
            .update(BranchMembershipsTable)
            .set({ isCurrent: false })
            .where(eq(BranchMembershipsTable.userId, userId));

        revalidateAuthCache({ id: userId });

        return { isError: false, updated: true };
    } catch (error) {
        return authError(error);
    }
}

export async function getBranches(
    userId: string,
    options?: { includeAllBranches?: boolean },
): Promise<BranchState> {
    const branches = await getBranchesByUserId(
        userId,
        options?.includeAllBranches ?? false,
    );

    const activeBranch = branches.find((branch) => branch.isCurrent);
    const hasActiveOrg = activeBranch !== undefined;

    if (!hasActiveOrg) {
        return { hasActiveOrg: false, branches, activeBranch };
    }

    return { hasActiveOrg, activeBranch, branches };
}
