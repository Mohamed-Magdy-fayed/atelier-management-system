"use client";

import { ImageOff } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function PublicDressCoverImage({
  src,
  alt,
  noImageLabel,
  className,
}: {
  src?: string | null;
  alt: string;
  noImageLabel: string;
  className?: string;
}) {
  const trimmed = src?.trim() ?? "";
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  const showImage = Boolean(trimmed) && !failed;

  if (!showImage) {
    return (
      <div
        className={cn(
          "flex size-full flex-col items-center justify-center gap-2.5 bg-muted/80 p-4 text-center",
          className,
        )}
      >
        <div className="flex size-12 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground shadow-sm">
          <ImageOff aria-hidden className="size-5" strokeWidth={1.5} />
        </div>
        <span className="max-w-[12rem] text-muted-foreground text-xs leading-snug">
          {noImageLabel}
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote dress URLs (Cloudinary / uploads)
    <img
      alt={alt}
      className={cn("size-full object-cover", className)}
      onError={() => setFailed(true)}
      src={trimmed}
    />
  );
}
