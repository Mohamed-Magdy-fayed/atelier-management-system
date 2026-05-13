"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadIcon } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type {
    UserImportCommitRow,
    UserImportPreviewRow,
    UserImportRole,
} from "@/integrations/trpc/routers/users";

import { ImportReviewDialog, ImportReviewStatusBadge } from "./import-review-dialog";
import type { ImportReviewColumn } from "../types";

type UsersImportRow = Omit<UserImportPreviewRow, "status"> & {
    status: "valid" | "invalid" | "done";
};

function mergeCommitRows(rows: UsersImportRow[], commits: UserImportCommitRow[]) {
    const commitsByRowNumber = new Map(commits.map((row) => [row.rowNumber, row]));

    return rows.map((row) => {
        const commit = commitsByRowNumber.get(row.rowNumber);
        if (!commit) return row;

        return {
            ...row,
            action: commit.action,
            reasons: commit.reasons,
            status: commit.status,
            targetUserId: commit.targetUserId,
        } satisfies UsersImportRow;
    });
}

export function UsersImportButton({ role }: { role: UserImportRole }) {
    const { t } = useTranslation();
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const previewMutation = useMutation(trpc.users.previewImport.mutationOptions());
    const commitMutation = useMutation(trpc.users.commitImport.mutationOptions());

    const columns = useMemo<ImportReviewColumn<UsersImportRow>[]>(
        () => [
            {
                id: "rowNumber",
                header: "#",
                cell: (row) => row.rowNumber,
                headerClassName: "w-14",
            },
            {
                id: "status",
                header: t("dataTable.importStatusColumn"),
                cell: (row) => <ImportReviewStatusBadge status={row.status} />,
                headerClassName: "min-w-28",
            },
            {
                id: "action",
                header: t("dataTable.importActionColumn"),
                cell: (row) =>
                    row.action === "create"
                        ? t("dataTable.importActionCreate")
                        : row.action === "restore"
                          ? t("dataTable.importActionRestore")
                          : t("dataTable.importActionSkip"),
                headerClassName: "min-w-24",
            },
            {
                id: "name",
                header: t("forms.name"),
                cell: (row) => row.values.name || "-",
                headerClassName: "min-w-32",
            },
            {
                id: "email",
                header: t("dataTable.columnEmail"),
                cell: (row) => row.values.email || "-",
                headerClassName: "min-w-48",
            },
            {
                id: "phone",
                header: t("dataTable.phone"),
                cell: (row) => row.values.phone || "-",
                headerClassName: "min-w-32",
            },
            {
                id: "age",
                header: t("forms.age"),
                cell: (row) => (row.values.age == null ? "-" : row.values.age),
                headerClassName: "min-w-20",
            },
            {
                id: "result",
                header: t("dataTable.importResultColumn"),
                cell: (row) =>
                    row.status === "done"
                        ? t("dataTable.importResultDone")
                        : row.reasons.length > 0
                          ? row.reasons.join(" ")
                          : t("dataTable.importResultReady"),
                headerClassName: "min-w-56",
                cellClassName: "whitespace-normal text-muted-foreground",
            },
        ],
        [t],
    );

    return (
        <Tooltip>
            <ImportReviewDialog<UsersImportRow>
                trigger={
                    <TooltipTrigger
                        render={
                            <Button
                                variant="outline"
                                size="icon"
                                type="button"
                                className="size-8"
                                aria-label={t("dataTable.importCsv")}
                            >
                                <UploadIcon className="size-3.5" />
                            </Button>
                        }
                    />
                }
                columns={columns}
                previewFile={(file) =>
                    previewMutation.mutateAsync({
                        role,
                        headers: file.headers,
                        rows: file.rows,
                    })
                }
                commitFile={async ({ file, reviewRows, rowsToCommit }) => {
                    const result = await commitMutation.mutateAsync({
                        role,
                        rows: rowsToCommit.map((row) => ({
                            rowNumber: row.rowNumber,
                            raw: file.rows[row.rowNumber - 1] ?? {},
                        })),
                    });

                    return mergeCommitRows(reviewRows, result.rows);
                }}
                onCommitted={async () => {
                    await queryClient.invalidateQueries({
                        queryKey: trpc.users.pathKey(),
                    });
                }}
                getRowId={(row) => row.rowNumber}
            />
            <TooltipContent>{t("dataTable.importCsv")}</TooltipContent>
        </Tooltip>
    );
}
