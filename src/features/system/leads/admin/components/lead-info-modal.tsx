"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/features/core/i18n/client";
import type { Lead } from "@/integrations/trpc/routers/leads";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  new: "default",
  contacted: "secondary",
  qualified: "outline",
  closed: "secondary",
};

type Props = {
  lead: Lead | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function LeadInfoModal({ lead, onOpenChange, open }: Props) {
  const { t, locale } = useTranslation();
  const dateFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead?.name ?? "—"}</DialogTitle>
          <DialogDescription>{lead?.email ?? ""}</DialogDescription>
        </DialogHeader>
        {lead && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={STATUS_VARIANT[lead.status] ?? "secondary"}>
                {String(t(`leads.statusValues.${lead.status}`))}
              </Badge>
              {lead.company && (
                <span className="text-muted-foreground">{lead.company}</span>
              )}
              {lead.phone && (
                <span className="text-muted-foreground">{lead.phone}</span>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium uppercase tracking-wide">
                {String(t("leads.message"))}
              </p>
              <p className="leading-relaxed whitespace-pre-wrap">
                {lead.message}
              </p>
            </div>
            <Separator />
            <div className="text-muted-foreground text-xs">
              <span className="font-medium">
                {String(t("leads.createdAt"))}:
              </span>{" "}
              {lead.createdAt ? dateFmt.format(new Date(lead.createdAt)) : "—"}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
