"use client";

import { CheckIcon, Share2Icon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  dressId: string;
  dressTitle: string;
  scanLabel: string;
  shareLabel: string;
  copiedLabel: string;
  size?: number;
};

export function DressQrShare({
  dressId,
  dressTitle,
  scanLabel,
  shareLabel,
  copiedLabel,
  size = 140,
}: Props) {
  const [copied, setCopied] = useState(false);

  const href =
    typeof window !== "undefined"
      ? `${window.location.origin}/collection/${dressId}`
      : `/collection/${dressId}`;

  async function handleShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/collection/${dressId}`
        : `/collection/${dressId}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: dressTitle, url });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
        <QRCodeSVG
          bgColor="#ffffff"
          fgColor="#09090b"
          level="M"
          size={size}
          value={href}
        />
      </div>
      <p className="text-muted-foreground text-xs">{scanLabel}</p>
      <Button onClick={handleShare} size="sm" variant="outline">
        {copied ? <CheckIcon className="text-secondary" /> : <Share2Icon />}
        {copied ? copiedLabel : shareLabel}
      </Button>
    </div>
  );
}
