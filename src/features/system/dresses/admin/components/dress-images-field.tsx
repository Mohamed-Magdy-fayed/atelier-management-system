"use client";

import { useMutation } from "@tanstack/react-query";
import { Trash2Icon, UploadCloudIcon } from "lucide-react";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import type { FileUploadProps } from "@/components/ui/file-upload";
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 20;

function resolveDisplayUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  if (typeof window === "undefined") {
    return url;
  }
  return new URL(url, window.location.origin).toString();
}

export type DressImagesEditorProps = {
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  disabled?: boolean;
};

export function DressImagesEditor({
  urls,
  onUrlsChange,
  disabled,
}: DressImagesEditorProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const urlsRef = useRef(urls);
  urlsRef.current = urls;

  const { mutateAsync: uploadImage, isPending } = useMutation(
    trpc.uploadImage.mutationOptions(),
  );

  const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
    async (files, options) => {
      for (const file of files) {
        if (urlsRef.current.length >= MAX_IMAGES) {
          toast.error(String(t("systemPages.dressesImagesLimit")));
          break;
        }

        try {
          options.onProgress(file, 20);

          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              if (typeof result !== "string") {
                reject(new Error("Failed to read file"));
                return;
              }

              const [, encoded = ""] = result.split(",", 2);
              if (!encoded) {
                reject(new Error("Failed to encode file"));
                return;
              }

              resolve(encoded);
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsDataURL(file);
          });

          const payload = await uploadImage({
            fileName: file.name,
            mimeType: file.type,
            base64,
            oldUrl: null,
          });

          if (!payload?.url) {
            throw new Error("Upload failed");
          }

          const uploadedUrl = payload.url.startsWith("http")
            ? payload.url
            : new URL(payload.url, window.location.origin).toString();

          options.onProgress(file, 100);
          options.onSuccess(file);

          const next = [...urlsRef.current, uploadedUrl];
          urlsRef.current = next;
          onUrlsChange(next);
        } catch (error) {
          const uploadError =
            error instanceof Error
              ? error
              : new Error("An unknown error occurred");
          options.onError(file, uploadError);
          toast.error(uploadError.message);
        }
      }
    },
    [onUrlsChange, uploadImage, t],
  );

  const removeAt = (index: number) => {
    onUrlsChange(urls.filter((_, i) => i !== index));
  };

  const atLimit = urls.length >= MAX_IMAGES;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        {String(t("systemPages.dressesImagesHint", { count: MAX_IMAGES }))}
      </p>
      <ul className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <li
            key={`${url}-${String(index)}`}
            className="relative size-20 overflow-hidden rounded-md border bg-muted"
          >
            <img
              alt=""
              src={resolveDisplayUrl(url)}
              className="size-full object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon-xs"
              className="absolute inset-e-1 top-1 size-6"
              disabled={disabled || isPending}
              aria-label={String(t("systemPages.dressesRemoveImageAria"))}
              onClick={() => removeAt(index)}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <FileUpload
        accept="image/*"
        maxFiles={1}
        maxSize={4 * 1024 * 1024}
        className="flex w-full items-start"
        disabled={disabled || isPending || atLimit}
        onUpload={onUpload}
      >
        <FileUploadTrigger
          type="button"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-auto min-h-7 gap-1.5 whitespace-normal px-2 py-1.5",
          )}
        >
          <UploadCloudIcon className="size-3.5 shrink-0" />
          <span>{String(t("systemPages.dressesAddImage"))}</span>
        </FileUploadTrigger>
      </FileUpload>
    </div>
  );
}
