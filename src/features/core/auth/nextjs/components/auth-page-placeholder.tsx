"use client";

import { FingerprintPattern, LockIcon, ShieldCheckIcon } from "lucide-react";
import { Lead } from "@/components/ui/typography";
import { useBrandName } from "@/features/system/settings/client/branding-provider";

export function AuthPlaceholder() {
  const brandName = useBrandName();

  return (
    <div className="grid h-full w-full place-content-center gap-4 p-6">
      <div className="grid grid-cols-2 justify-items-center gap-4 text-primary *:size-16">
        <ShieldCheckIcon />
        <FingerprintPattern />
        <LockIcon className="col-span-2" />
      </div>
      <Lead className="text-center font-mono text-2xl text-foreground text-shadow-lg text-shadow-primary">
        {brandName}
      </Lead>
    </div>
  );
}
