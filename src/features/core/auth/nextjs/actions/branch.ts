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
import { authError } from "@/features/core/auth/core";
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
    const { id } = await getCurrentUser({ redirectIfNotFound: true });

    const { nameAr, nameEn } = await validateInput(createBranchSchema, rawInput);
    const trimmedEn = nameEn.trim();
    const trimmedAr = nameAr.trim();

    const branchId = await db.transaction(async (trx) => {
        const branch = await trx
            .insert(BranchesTable)
            .values({ nameEn: trimmedEn, nameAr: trimmedAr, ownerId: id })
            .returning({ id: BranchesTable.id })
            .then((res) => res[0]);

        await trx
            .insert(BranchMembershipsTable)
            .values({
                isCurrent: false,
                branchId: branch.id,
                userId: id,
            })
            .onConflictDoNothing();

        return branch.id;
    });

    revalidateAuthCache({ id, branchId });

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
    const { id: actorUserId } = await getCurrentUser({
        redirectIfNotFound: true,
    });

    const branch = await db.query.BranchesTable.findFirst({
        columns: { id: true, ownerId: true },
        where: eq(BranchesTable.id, branchId),
    });

    if (!branch) {
        return {
            isError: true,
            message: t("authTranslations.branch.actions.updateBranch.notFound"),
        };
    }

    if (branch.ownerId !== actorUserId) {
        return {
            isError: true,
            message: t("authTranslations.branch.actions.updateBranch.ownerOnly"),
        };
    }

    await db
        .update(BranchesTable)
        .set({
            nameEn: nameEn.trim(),
            nameAr: nameAr.trim(),
        })
        .where(eq(BranchesTable.id, branchId));

    revalidateAuthCache({ id: actorUserId, branchId });

    return { isError: false, updated: true };
}

export async function deleteBranchAction(
    rawInput: string,
): Promise<TypedResponse<{ deleted: true }>> {
    const { t } = await getT();
    const branchId = await validateInput(z.uuid(), rawInput);
    const { id: actorUserId } = await getCurrentUser({
        redirectIfNotFound: true,
    });

    const branch = await db.query.BranchesTable.findFirst({
        columns: { id: true, ownerId: true },
        where: eq(BranchesTable.id, branchId),
    });

    if (!branch) {
        return {
            isError: true,
            message: t("authTranslations.branch.actions.deleteBranch.notFound"),
        };
    }
    if (branch.ownerId !== actorUserId)
        return {
            isError: true,
            message: t("authTranslations.branch.actions.deleteBranch.ownerOnly"),
        };

    await db.delete(BranchesTable).where(eq(BranchesTable.id, branchId));

    revalidateAuthCache({ id: actorUserId, branchId });

    return { isError: false, deleted: true };
}

export async function upsertUserBranchesAction(
    rawInput: z.infer<typeof upsertBranchesInputSchema>,
): Promise<TypedResponse<{ updated: true }>> {
    const { t } = await getT();

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
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });

    return getBranchesByUserId(userId);
}

export async function getBranchesByUserId(userId: string): Promise<Array<FullBranch>> {
    "use cache";
    cacheTag(getUserIdTag(userId));

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
    const { id: userId } = await getCurrentUser({ redirectIfNotFound: true });
    try {
        await db.transaction(async (trx) => {
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
        return authError(error);
    }
}

export async function getBranches(userId: string): Promise<BranchState> {
    const branches = await getBranchesByUserId(userId);

    const activeBranch = branches.find((branch) => branch.isCurrent);
    const hasActiveOrg = activeBranch !== undefined;

    if (!hasActiveOrg) {
        return { hasActiveOrg: false, branches, activeBranch };
    }

    return { hasActiveOrg, activeBranch, branches };
}
