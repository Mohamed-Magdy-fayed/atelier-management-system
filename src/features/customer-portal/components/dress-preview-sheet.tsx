"use client";

import { EyeIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PublicDressCoverImage } from "@/features/public-catalog/components/public-dress-cover-image";

type Props = {
  dressTitle: string;
  dressCode: string;
  dressImages: string[] | null;
  dressSize: string | null;
  dressColor: string | null;
  dressDescription: string | null;
  triggerLabel: string;
  noImageLabel: string;
  sizeLabel: string;
  colorLabel: string;
};

export function DressPreviewSheet({
  dressTitle,
  dressCode,
  dressImages,
  dressSize,
  dressColor,
  dressDescription,
  triggerLabel,
  noImageLabel,
  sizeLabel,
  colorLabel,
}: Props) {
  const cover = dressImages?.[0] ?? null;
  const gallery = dressImages?.slice(1) ?? [];

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button size="sm" variant="outline">
            <EyeIcon />
            {triggerLabel}
          </Button>
        }
      />
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle>{dressTitle}</SheetTitle>
          <SheetDescription className="font-mono">{dressCode}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4 px-6 pb-8">
            <div className="mx-auto aspect-3/4 w-full max-w-xs overflow-hidden rounded-2xl border bg-muted">
              <PublicDressCoverImage
                alt={dressTitle}
                noImageLabel={noImageLabel}
                src={cover}
              />
            </div>
            {gallery.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gallery.map((img) => (
                  <div
                    className="size-16 shrink-0 overflow-hidden rounded-lg border bg-muted"
                    key={img}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="" className="size-full object-cover" src={img} />
                  </div>
                ))}
              </div>
            ) : null}
            {dressSize || dressColor ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {dressSize ? (
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {sizeLabel}
                    </dt>
                    <dd className="font-medium">{dressSize}</dd>
                  </div>
                ) : null}
                {dressColor ? (
                  <div>
                    <dt className="text-muted-foreground text-xs">
                      {colorLabel}
                    </dt>
                    <dd className="font-medium">{dressColor}</dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
            {dressDescription ? (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {dressDescription}
              </p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
