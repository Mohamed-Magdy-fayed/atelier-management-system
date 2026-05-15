"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { SettingGridRow } from "@/integrations/trpc/routers/settings";

import {
  SettingRowActions,
  type SetSettingRowAction,
} from "./setting-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

function settingsLabelTranslationId(label: string) {
  switch (label) {
    case "policy":
      return "systemPages.settingsLabelPolicy" as const;
    case "integration":
      return "systemPages.settingsLabelIntegration" as const;
    default:
      return "systemPages.settingsCategory";
  }
}

export function buildSettingColumns(opts: {
  locale: string;
  setRowAction: SetSettingRowAction;
  t: Translate;
}): ColumnDef<SettingGridRow>[] {
  const { locale, setRowAction, t } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const moneyFmt = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    maximumFractionDigits: 0,
  });

  return [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.settingsCode"))}
        />
      ),
      meta: { label: String(t("systemPages.settingsCode")) },
    },
    {
      accessorKey: "label",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.settingsCategory"))}
        />
      ),
      meta: { label: String(t("systemPages.settingsCategory")) },
      cell: ({ row }) =>
        String(t(settingsLabelTranslationId(row.original.label))),
    },
    {
      accessorKey: "isActive",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.settingsIsActive"))}
        />
      ),
      meta: { label: String(t("systemPages.settingsIsActive")) },
      cell: ({ row }) => {
        const v = row.original.isActive;
        if (v === null) return "—";
        return (
          <Badge variant={v ? "default" : "secondary"}>
            {String(
              t(
                v ? "systemPages.settingsStateEnabled" : "systemPages.settingsStateDisabled",
              ),
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.settingsAmount"))}
        />
      ),
      meta: { label: String(t("systemPages.settingsAmount")) },
      cell: ({ row }) =>
        row.original.amount != null
          ? moneyFmt.format(row.original.amount)
          : "—",
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("common.createdAt"))}
        />
      ),
      meta: { label: String(t("common.createdAt")) },
      cell: ({ row }) =>
        row.original.createdAt
          ? dateFmt.format(new Date(row.original.createdAt))
          : "—",
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      size: 48,
      meta: { label: String(t("common.actions")) },
      header: () => (
        <span className="text-xs font-medium">
          {String(t("common.actions"))}
        </span>
      ),
      cell: ({ row }) => (
        <SettingRowActions row={row.original} setRowAction={setRowAction} />
      ),
    },
  ];
}
