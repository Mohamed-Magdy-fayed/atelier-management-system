"use client";

import { QrCodeIcon } from "lucide-react";
import { useEffect, useState } from "react";

type DressReceiptQrProps = {
  dressId: string;
};

export function DressReceiptQr({ dressId }: DressReceiptQrProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}/collection/${dressId}`;
    setSrc(
      `https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(url)}`,
    );
  }, [dressId]);

  if (!src) {
    return <QrCodeIcon className="aspect-square w-20 text-muted-foreground" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- receipt print QR
    <img alt="" className="size-32" height={128} src={src} width={128} />
  );
}
