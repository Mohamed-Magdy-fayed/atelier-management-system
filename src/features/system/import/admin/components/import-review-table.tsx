"use client";

import { useQuery } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadCsv, rowsToCsv } from "@/features/core/data-table";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";

import type { ImportEntitySpec } from "../../specs";

type RowFilter = "all" | "valid" | "invalid" | "done";

const ROWS_PER_PAGE = 50;

function statusVariant(status: string) {
  if (status === "invalid") return "destructive" as const;
  if (status === "done") return "outline" as const;
  return "secondary" as const;
}

export function ImportReviewTable({
  jobId,
  spec,
  counts,
}: {
  jobId: string;
  spec: ImportEntitySpec;
  counts: { valid: number; invalid: number };
}) {
  const { t } = useTranslation();
  const trpc = useTRPC();

  // Invalid first: after a validation run that is what the admin came to see.
  const [filter, setFilter] = useState<RowFilter>(
    counts.invalid > 0 ? "invalid" : "all",
  );
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery(
    trpc.import.listRows.queryOptions({
      jobId,
      filter,
      page,
      perPage: ROWS_PER_PAGE,
    }),
  );

  const invalidRowsQuery = useQuery({
    ...trpc.import.listInvalidRows.queryOptions({ jobId }),
    enabled: false,
  });

  async function downloadErrorReport() {
    const result = await invalidRowsQuery.refetch();
    const rows = result.data?.rows ?? [];

    const headers = ["row", "reasons", ...spec.columns.map((c) => c.key)];

    downloadCsv(
      `${spec.slug}-import-errors.csv`,
      rowsToCsv(
        headers,
        rows.map((row) => ({
          row: row.rowNumber,
          reasons: row.reasons.join(" | "),
          ...(row.values as Record<string, unknown>),
        })),
      ),
    );
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));

  function selectFilter(next: RowFilter) {
    setFilter(next);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <ButtonGroup>
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => selectFilter("all")}
          >
            {t("dataTable.importFilterAll")} ({counts.valid + counts.invalid})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "valid" ? "default" : "outline"}
            onClick={() => selectFilter("valid")}
          >
            {t("dataTable.importFilterValid")} ({counts.valid})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "invalid" ? "default" : "outline"}
            onClick={() => selectFilter("invalid")}
          >
            {t("dataTable.importFilterInvalid")} ({counts.invalid})
          </Button>
        </ButtonGroup>

        {counts.invalid > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void downloadErrorReport()}
            disabled={invalidRowsQuery.isFetching}
          >
            <DownloadIcon data-icon="inline-start" />
            {t("systemPages.importDownloadErrors")}
          </Button>
        ) : null}
      </div>

      <ScrollArea className="w-full rounded-md border">
        <div className="min-w-max">
          <table className="w-full text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 bg-background">#</TableHead>
                <TableHead className="min-w-24 bg-background">
                  {t("dataTable.importStatusColumn")}
                </TableHead>
                <TableHead className="min-w-24 bg-background">
                  {t("dataTable.importActionColumn")}
                </TableHead>
                {spec.columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className="min-w-32 bg-background"
                  >
                    {column.key}
                  </TableHead>
                ))}
                <TableHead className="min-w-56 bg-background">
                  {t("dataTable.importResultColumn")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                rows.map((row) => {
                  const values = row.values as Record<string, unknown>;
                  return (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>
                          {t(
                            row.status === "valid"
                              ? "dataTable.importStatusValid"
                              : row.status === "invalid"
                                ? "dataTable.importStatusInvalid"
                                : "dataTable.importStatusDone",
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t(
                          row.action === "create"
                            ? "dataTable.importActionCreate"
                            : row.action === "update"
                              ? "dataTable.importActionUpdate"
                              : "dataTable.importActionSkip",
                        )}
                      </TableCell>
                      {spec.columns.map((column) => (
                        <TableCell key={column.key}>
                          {values[column.key] == null ||
                          values[column.key] === ""
                            ? "—"
                            : String(values[column.key])}
                        </TableCell>
                      ))}
                      <TableCell className="whitespace-normal text-muted-foreground">
                        {row.reasons.length > 0 ? row.reasons.join(" ") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={spec.columns.length + 4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {isFetching
                      ? t("common.loading")
                      : t("dataTable.importNoRowsForFilter")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </ScrollArea>

      {pageCount > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs">
          <span className="text-muted-foreground">
            {t("systemPages.importPageOf", {
              page: String(page),
              pages: String(pageCount),
            })}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            {t("systemPages.importPrevious")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => setPage((current) => current + 1)}
          >
            {t("common.next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
