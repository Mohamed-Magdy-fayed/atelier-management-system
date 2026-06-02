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
import type { Service } from "@/integrations/trpc/routers/services-mgmt";

type Props = {
  service: Service | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function ServiceInfoModal({ service, onOpenChange, open }: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{service?.title ?? "—"}</DialogTitle>
          <DialogDescription>{service?.icon ?? ""}</DialogDescription>
        </DialogHeader>
        {service && (
          <div className="space-y-3 text-sm">
            <Badge variant={service.isActive ? "default" : "secondary"}>
              {service.isActive
                ? String(t("common.active"))
                : String(t("common.inactive"))}
            </Badge>
            <Separator />
            <p className="text-muted-foreground leading-relaxed">
              {service.shortDescription}
            </p>
            {(service.features as string[]).length > 0 && (
              <ul className="list-inside list-disc space-y-1">
                {(service.features as string[]).map((f) => (
                  <li key={f} className="text-sm">
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
