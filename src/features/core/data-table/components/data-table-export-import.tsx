"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/features/core/i18n/client";

import { downloadCsv, parseCsvToObjects, rowsToCsv } from "../lib/csv";

type DataTableExportImportProps<T> = {
  table: TanstackTable<T>;
  /** Row → plain object for CSV (keys = column ids) */
  getExportRow: (row: T) => Record<string, unknown>;
  exportFileName?: string;
  onImportParsed?: (rows: Record<string, unknown>[]) => void;
  /**
   * Server-mode hook: when no rows are selected, asked to fetch every row
   * matching the current filters/sorting (no pagination). When omitted the
   * export falls back to `table.getFilteredRowModel().rows` (client mode).
   */
  fetchAllRows?: () => Promise<T[]>;
};

export function DataTableExportImport<T>({
  table,
  getExportRow,
  exportFileName = "export.csv",
  onImportParsed,
  fetchAllRows,
}: DataTableExportImportProps<T>) {
  const { t } = useTranslation();
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [exporting, setExporting] = useState(false);

  const visibleCols = table
    .getVisibleLeafColumns()
    .filter((c) => c.id !== "select" && c.id !== "actions");
  const headers = visibleCols.map((c) => c.id);

  async function handleExport() {
    setExporting(true);
    try {
      const selected = table.getFilteredSelectedRowModel().rows;
      let rows: T[];

      if (selected.length > 0) {
        // 1. Selected rows always win.
        rows = selected.map((r) => r.original);
      } else if (fetchAllRows) {
        // 2. Server mode — fetch every match (limit enforced server-side).
        rows = await fetchAllRows();
      } else {
        // 3. Client mode — current filter, all pages already in memory.
        rows = table
          .getFilteredRowModel()
          .rows.map((r) => r.original);
      }

      const csv = rowsToCsv(headers, rows.map(getExportRow));
      downloadCsv(exportFileName, csv);
      toast.success(
        String(t("dataTable.exportSuccess", { count: rows.length })),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : String(t("dataTable.exportFailed")),
      );
    } finally {
      setExporting(false);
    }
  }

  const handleImportApply = () => {
    const parsed = parseCsvToObjects(importText);
    if (!parsed) {
      toast.error(String(t("dataTable.importInvalid")));
      return;
    }
    const { rows: objects } = parsed;
    onImportParsed?.(objects);
    setImportOpen(false);
    setImportText("");
    toast.message(
      String(t("dataTable.importParsed", { count: objects.length })),
    );
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              type="button"
              className="size-8"
              onClick={() => void handleExport()}
              disabled={exporting}
              aria-label={String(t("dataTable.export.export"))}
            >
              <DownloadIcon className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent>{String(t("dataTable.export.export"))}</TooltipContent>
      </Tooltip>
      {onImportParsed ? (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  className="size-8"
                  onClick={() => setImportOpen(true)}
                  aria-label={String(t("dataTable.importCsv"))}
                >
                  <UploadIcon className="size-3.5" />
                </Button>
              }
            />
            <TooltipContent>{String(t("dataTable.importCsv"))}</TooltipContent>
          </Tooltip>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{String(t("dataTable.importCsv"))}</DialogTitle>
                <DialogDescription>
                  {String(t("dataTable.importHint"))}
                </DialogDescription>
              </DialogHeader>
              <Input
                type="file"
                accept=".csv,text/csv"
                className="text-xs"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  file
                    .text()
                    .then(setImportText)
                    .catch(() =>
                      toast.error(String(t("dataTable.importInvalid"))),
                    );
                }}
              />
              {importText ? (
                <pre className="max-h-32 overflow-auto rounded-md border border-border bg-muted/40 p-2 text-[0.625rem]">
                  {importText.slice(0, 2000)}
                  {importText.length > 2000 ? "…" : ""}
                </pre>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImportOpen(false)}
                >
                  {String(t("common.cancel"))}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!importText}
                  onClick={handleImportApply}
                >
                  {String(t("dataTable.importApply"))}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </>
  );
}
