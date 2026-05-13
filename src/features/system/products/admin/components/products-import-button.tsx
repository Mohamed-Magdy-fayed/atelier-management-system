"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UploadIcon } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ImportReviewDialog,
  ImportReviewStatusBadge,
  type ImportReviewColumn,
} from "@/features/core/import-review";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type {
  ProductImportCommitRow,
  ProductImportPreviewRow,
} from "@/integrations/trpc/routers/products";

type ProductsImportRow = Omit<ProductImportPreviewRow, "status"> & {
  status: "valid" | "invalid" | "done";
};

function mergeCommitRows(
  rows: ProductsImportRow[],
  commits: ProductImportCommitRow[],
) {
  const commitsByRowNumber = new Map(commits.map((row) => [row.rowNumber, row]));

  return rows.map((row) => {
    const commit = commitsByRowNumber.get(row.rowNumber);
    if (!commit) return row;

    return {
      ...row,
      action: commit.action,
      reasons: commit.reasons,
      status: commit.status,
      targetProductId: commit.targetProductId,
    } satisfies ProductsImportRow;
  });
}

export function ProductsImportButton() {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const previewMutation = useMutation(trpc.products.previewImport.mutationOptions());
  const commitMutation = useMutation(trpc.products.commitImport.mutationOptions());

  const columns = useMemo<ImportReviewColumn<ProductsImportRow>[]>(
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
              : row.action === "update"
                ? t("dataTable.importActionUpdate")
                : t("dataTable.importActionSkip"),
        headerClassName: "min-w-24",
      },
      {
        id: "code",
        header: t("systemPages.productsCode"),
        cell: (row) => row.values.code,
        headerClassName: "min-w-28",
      },
      {
        id: "nameEn",
        header: t("systemPages.productsNameEn"),
        cell: (row) => row.values.nameEn,
        headerClassName: "min-w-40",
      },
      {
        id: "nameAr",
        header: t("systemPages.productsNameAr"),
        cell: (row) => row.values.nameAr,
        headerClassName: "min-w-40",
      },
      {
        id: "price",
        header: t("systemPages.productsPrice"),
        cell: (row) => row.values.price,
        headerClassName: "min-w-24",
      },
      {
        id: "isActive",
        header: t("systemPages.productsStatus"),
        cell: (row) =>
          row.values.isActive ? t("common.active") : t("common.inactive"),
        headerClassName: "min-w-28",
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
      <ImportReviewDialog<ProductsImportRow>
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
            headers: file.headers,
            rows: file.rows,
          })
        }
        commitFile={async ({ file, reviewRows, rowsToCommit }) => {
          const result = await commitMutation.mutateAsync({
            rows: rowsToCommit.map((row) => ({
              rowNumber: row.rowNumber,
              raw: file.rows[row.rowNumber - 1] ?? {},
            })),
          });

          return mergeCommitRows(reviewRows, result.rows);
        }}
        onCommitted={async () => {
          await queryClient.invalidateQueries({
            queryKey: trpc.products.pathKey(),
          });
        }}
        getRowId={(row) => row.rowNumber}
      />
      <TooltipContent>{t("dataTable.importCsv")}</TooltipContent>
    </Tooltip>
  );
}
