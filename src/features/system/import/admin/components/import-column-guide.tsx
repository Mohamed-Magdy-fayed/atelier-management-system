"use client";

import { DownloadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTranslation } from "@/features/core/i18n/client";

import { downloadTemplate, sortColumnsForGuide } from "../../lib/template";
import type {
  ImportColumnSpec,
  ImportColumnType,
  ImportEntitySpec,
  ImportTranslationKey,
} from "../../specs";

const TYPE_LABEL_KEY = {
  string: "systemPages.importType_string",
  int: "systemPages.importType_int",
  money: "systemPages.importType_money",
  date: "systemPages.importType_date",
  datetime: "systemPages.importType_datetime",
  boolean: "systemPages.importType_boolean",
  enum: "systemPages.importType_enum",
  ref: "systemPages.importType_ref",
} as const satisfies Record<ImportColumnType, ImportTranslationKey>;

/**
 * The template CSV carries only bare headers, so this table is the sole place
 * required-vs-optional is communicated. It has to be unambiguous.
 */
export function ImportColumnGuide({ spec }: { spec: ImportEntitySpec }) {
  const { t } = useTranslation();
  const columns = sortColumnsForGuide(spec);

  function describeType(column: ImportColumnSpec) {
    if (column.type === "enum") {
      return (column.enumValues ?? []).join(" · ");
    }
    if (column.type === "ref" && column.ref) {
      return t("systemPages.importType_ref", { lookup: column.ref.lookupBy });
    }
    return t(TYPE_LABEL_KEY[column.type], {});
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-xs">
          {t("systemPages.importTemplateHint")}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start sm:self-auto"
          onClick={() => downloadTemplate(spec)}
        >
          <DownloadIcon data-icon="inline-start" />
          {t("systemPages.importDownloadTemplate")}
        </Button>
      </div>

      <ScrollArea className="w-full rounded-md border">
        <div className="min-w-max">
          <table className="w-full text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-background">
                  {t("systemPages.importGuideColumn")}
                </TableHead>
                <TableHead className="bg-background">
                  {t("systemPages.importGuideRequired")}
                </TableHead>
                <TableHead className="bg-background">
                  {t("systemPages.importGuideType")}
                </TableHead>
                <TableHead className="bg-background">
                  {t("systemPages.importGuideExample")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => (
                <TableRow key={column.key}>
                  <TableCell className="align-top">
                    <span className="font-medium font-mono">{column.key}</span>
                    <span className="block text-muted-foreground">
                      {t(column.labelKey, {})}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    {column.required ? (
                      <Badge variant="destructive">
                        {t("systemPages.importRequired")}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        {t("systemPages.importOptional")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-64 align-top whitespace-normal text-muted-foreground">
                    {describeType(column)}
                    {column.helpKey ? (
                      <span className="mt-1 block">
                        {t(column.helpKey, {})}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top font-mono text-muted-foreground">
                    {column.exampleValue}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}
