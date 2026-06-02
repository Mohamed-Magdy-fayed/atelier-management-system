"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import {
  createEntityActionsColumn,
  createSelectColumn,
  DataTableColumnHeader,
} from "@/features/core/data-table";
import type { useTranslation } from "@/features/core/i18n/client";
import type { Subscriber } from "@/integrations/trpc/routers/subscribers";

import {
  type SetSubscriberRowAction,
  SubscriberRowActions,
} from "./subscriber-row-actions";

type Translate = ReturnType<typeof useTranslation>["t"];

export function buildSubscriberColumns(opts: {
  t: Translate;
  locale: string;
  setRowAction: SetSubscriberRowAction;
}): ColumnDef<Subscriber>[] {
  const { t, locale, setRowAction } = opts;
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
  });

  return [
    createSelectColumn<Subscriber>(),
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("subscribers.email"))}
        />
      ),
      meta: { label: String(t("subscribers.email")), filterVariant: "text" },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("subscribers.status"))}
        />
      ),
      meta: { label: String(t("subscribers.status")) },
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "active" ? "default" : "secondary"}
        >
          {String(t(`subscribers.statusValues.${row.original.status}`))}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={String(t("subscribers.createdAt"))}
        />
      ),
      meta: { label: String(t("subscribers.createdAt")) },
      cell: ({ row }) =>
        row.original.createdAt
          ? dateFmt.format(new Date(row.original.createdAt))
          : "—",
    },
    createEntityActionsColumn({
      t,
      size: 48,
      cell: ({ row }) => (
        <SubscriberRowActions row={row.original} setRowAction={setRowAction} />
      ),
    }),
  ];
}
