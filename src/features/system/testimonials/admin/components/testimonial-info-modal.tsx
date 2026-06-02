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
import type { Testimonial } from "@/integrations/trpc/routers/testimonials";

type Props = {
  testimonial: Testimonial | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function TestimonialInfoModal({
  testimonial,
  onOpenChange,
  open,
}: Props) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{testimonial?.clientName ?? "—"}</DialogTitle>
          <DialogDescription>
            {testimonial?.role
              ? `${testimonial.role}, ${testimonial.company}`
              : testimonial?.company}
          </DialogDescription>
        </DialogHeader>
        {testimonial && (
          <div className="space-y-3 text-sm">
            <Badge variant={testimonial.isVisible ? "default" : "secondary"}>
              {testimonial.isVisible
                ? String(t("common.active"))
                : String(t("common.inactive"))}
            </Badge>
            <Separator />
            <p className="text-foreground/80 italic leading-relaxed">
              &ldquo;{testimonial.content}&rdquo;
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
