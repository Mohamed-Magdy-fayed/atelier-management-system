"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";

export type EntityAuditRecord = {
  id: string;
  createdAt?: Date | string | null;
  createdBy?: string | null;
  updatedAt?: Date | string | null;
  updatedBy?: string | null;
  deletedAt?: Date | string | null;
  deletedBy?: string | null;
};

type EntityAuditInfoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: EntityAuditRecord | null;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Actor columns also hold non-user sentinels written by seeds and sign-up flows. */
function actorSentinelKey(value: string) {
  switch (value) {
    case "system":
    case "system:seed":
      return "systemPages.auditActorSystem" as const;
    case "oauth":
      return "systemPages.auditActorOAuth" as const;
    case "self-signup":
      return "systemPages.auditActorSelfSignup" as const;
    default:
      return null;
  }
}

/**
 * Actor columns are varchar, not a FK, so a value is only resolvable through
 * `users.resolveActors` when it is shaped like a user id — the sentinels above
 * are not.
 */
export function isUserId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function AuditRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-start gap-2 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words text-foreground">{value}</span>
    </div>
  );
}

export function EntityAuditInfoDialog({
  open,
  onOpenChange,
  record,
}: EntityAuditInfoDialogProps) {
  const { t, locale } = useTranslation();
  const trpc = useTRPC();
  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  // Sorted + deduped so records sharing actors also share one cache entry.
  const actorIds = useMemo(
    () =>
      Array.from(
        new Set(
          [record?.createdBy, record?.updatedBy, record?.deletedBy].filter(
            isUserId,
          ),
        ),
      ).sort(),
    [record?.createdBy, record?.updatedBy, record?.deletedBy],
  );

  const actorsQuery = useQuery({
    ...trpc.users.resolveActors.queryOptions({ ids: actorIds }),
    enabled: open && actorIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const actorsById = useMemo(() => {
    const map = new Map<string, { name: string | null; email: string }>();
    for (const actor of actorsQuery.data ?? []) {
      map.set(actor.id, { name: actor.name, email: actor.email });
    }
    return map;
  }, [actorsQuery.data]);

  if (!record) return null;

  const dash = "—";
  const formatDate = (value: Date | string | null | undefined) => {
    if (!value) return dash;
    return dateTimeFmt.format(new Date(value));
  };

  const renderActor = (value: string | null | undefined) => {
    if (!value) return dash;

    const sentinelKey = actorSentinelKey(value);
    if (sentinelKey) return String(t(sentinelKey));
    if (!isUserId(value)) return value;

    const actor = actorsById.get(value);
    if (actor) {
      return <span title={value}>{actor.name?.trim() || actor.email}</span>;
    }

    if (actorsQuery.isPending || actorsQuery.isFetching) {
      return <Skeleton className="inline-block h-4 w-40 align-middle" />;
    }

    return (
      <span className="text-muted-foreground" title={value}>
        {String(t("systemPages.auditActorUnknown"))}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{String(t("systemPages.auditInfoTitle"))}</DialogTitle>
          <DialogDescription>
            {String(t("systemPages.auditInfoDescription"))}
          </DialogDescription>
        </DialogHeader>
        <div className="divide-y divide-border">
          <AuditRow
            label={String(t("dataTable.id"))}
            value={<code className="text-[0.7rem]">{record.id}</code>}
          />
          <AuditRow
            label={String(t("common.createdAt"))}
            value={formatDate(record.createdAt)}
          />
          {record.createdBy !== undefined ? (
            <AuditRow
              label={String(t("common.createdBy"))}
              value={renderActor(record.createdBy)}
            />
          ) : null}
          <AuditRow
            label={String(t("common.updatedAt"))}
            value={formatDate(record.updatedAt)}
          />
          {record.updatedBy !== undefined ? (
            <AuditRow
              label={String(t("common.updatedBy"))}
              value={renderActor(record.updatedBy)}
            />
          ) : null}
          {record.deletedAt ? (
            <>
              <AuditRow
                label={String(t("common.deletedAt"))}
                value={formatDate(record.deletedAt)}
              />
              <AuditRow
                label={String(t("common.deletedBy"))}
                value={renderActor(record.deletedBy)}
              />
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
