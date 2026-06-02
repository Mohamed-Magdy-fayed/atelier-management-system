"use client";

import { CheckIcon, CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Muted } from "@/components/ui/typography";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

export function DressPublicShare({ dressId }: { dressId: string }) {
  const { t } = useTranslation();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicPath = `/collection/${dressId}`;
  const absoluteUrl = origin.length > 0 ? `${origin}${publicPath}` : publicPath;

  const qrSrc =
    absoluteUrl.length > 0 && absoluteUrl.startsWith("http")
      ? `https://api.qrserver.com/v1/create-qr-code/?size=132x132&data=${encodeURIComponent(absoluteUrl)}`
      : null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      toast.success(String(t("publicCatalog.linkCopied")));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(String(t("publicCatalog.checkFailed")));
    }
  }

  return (
    <div className="rounded-xl border bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
            {String(t("publicCatalog.viewDressPage"))}
          </p>
          <code className="block truncate rounded-md bg-background px-2 py-1.5 font-mono text-[0.7rem]">
            {absoluteUrl}
          </code>
          <Muted className="text-[0.7rem] leading-relaxed">
            {String(t("publicCatalog.staffOnlyNotice"))}
          </Muted>
        </div>
        {qrSrc ? (
          <div className="shrink-0 overflow-hidden rounded-lg border bg-background p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" className="size-[132px]" src={qrSrc} />
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          disabled={!origin}
          onClick={() => void copyLink()}
          size="sm"
          type="button"
          variant="secondary"
        >
          {copied ? (
            <CheckIcon className="mr-2 size-3.5" />
          ) : (
            <CopyIcon className="mr-2 size-3.5" />
          )}
          {String(t("publicCatalog.copyPublicLink"))}
        </Button>
        <a
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "inline-flex",
          )}
          href={publicPath}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLinkIcon className="mr-2 size-3.5" />
          {String(t("publicCatalog.openPublicPage"))}
        </a>
      </div>
    </div>
  );
}
