"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Muted } from "@/components/ui/typography";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import {
  getSettingDisplayDescription,
  getSettingDisplayName,
} from "@/features/system/settings/lib/setting-i18n";
import { SYSTEM_SETTING_CODE } from "@/features/system/settings/lib/system-settings-registry";
import type { SettingGridRow } from "@/integrations/trpc/routers/settings";

import {
  type SetSettingRowAction,
  SettingRowActions,
} from "./setting-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

function stateLabel(
  code: string,
  isActive: boolean | null,
  t: Translate,
): string {
  if (isActive === null) {
    return String(t("systemPages.settingsIsActiveUnset"));
  }
  if (code === SYSTEM_SETTING_CODE.SHOW_CATALOG_PRICES) {
    return String(
      t(
        isActive
          ? "systemPages.settingStatePricesShown"
          : "systemPages.settingStatePricesHidden",
      ),
    );
  }
  return String(
    t(
      isActive
        ? "systemPages.settingsStateEnabled"
        : "systemPages.settingsStateDisabled",
    ),
  );
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

  return [
    createSelectColumn<SettingGridRow>(),
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.settingsCode"))}
        />
      ),
      meta: { label: String(t("systemPages.settingsCode")) },
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.code}</span>
      ),
    },
    {
      id: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.settingsName"))}
        />
      ),
      meta: { label: String(t("systemPages.settingsName")) },
      cell: ({ row }) => getSettingDisplayName(row.original.code, t),
    },
    {
      id: "description",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("forms.description"))}
        />
      ),
      meta: { label: String(t("forms.description")) },
      cell: ({ row }) => (
        <Muted className="line-clamp-2 max-w-md text-xs leading-relaxed">
          {getSettingDisplayDescription(row.original.code, t)}
        </Muted>
      ),
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
          <Badge variant={v ? "secondary" : "destructive"}>
            {stateLabel(row.original.code, v, t)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "value",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("systemPages.settingsValue"))}
        />
      ),
      meta: { label: String(t("systemPages.settingsValue")) },
      cell: ({ row }) => {
        const value = row.original.value?.trim();
        if (!value) return "—";
        return (
          <span className="line-clamp-2 max-w-[14rem] text-xs">{value}</span>
        );
      },
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
    createEntityActionsColumn({
      t,
      size: 48,
      cell: ({ row }) => (
        <SettingRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
