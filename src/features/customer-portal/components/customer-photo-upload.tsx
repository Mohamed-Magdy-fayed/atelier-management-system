"use client";

import { useMutation } from "@tanstack/react-query";
import { CameraIcon, UploadCloudIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { FileUploadProps } from "@/components/ui/file-upload";
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload";
import { Muted } from "@/components/ui/typography";
import { useTRPC } from "@/integrations/trpc/client";

interface Props {
  reservationId: string;
  photoUrl: string | null;
  uploadPrompt: string;
  replaceLabel: string;
}

export function CustomerPhotoUpload({
  reservationId,
  photoUrl: initialPhotoUrl,
  uploadPrompt,
  replaceLabel,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const trpc = useTRPC();

  const { mutateAsync, isPending } = useMutation(
    trpc.customerPortal.uploadReservationPhoto.mutationOptions(),
  );

  const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
    async (files, options) => {
      for (const file of files) {
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

          const result = await mutateAsync({
            reservationId,
            fileName: file.name,
            mimeType: file.type,
            base64,
          });

          options.onProgress(file, 100);
          options.onSuccess(file);
          setPhotoUrl(result.url);
        } catch (error) {
          const err =
            error instanceof Error ? error : new Error("Upload failed");
          options.onError(file, err);
          toast.error(err.message);
        }
      }
    },
    [mutateAsync, reservationId],
  );

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      {photoUrl ? (
        <div className="flex items-start gap-3">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border">
            <Image
              alt="Customer photo"
              className="object-cover"
              fill
              sizes="80px"
              src={photoUrl}
            />
          </div>
          <FileUpload
            accept="image/*"
            className="flex items-center"
            disabled={isPending}
            maxFiles={1}
            maxSize={4 * 1024 * 1024}
            onUpload={onUpload}
          >
            <FileUploadTrigger asChild>
              <Button
                className="h-auto px-3 py-1.5 text-xs"
                disabled={isPending}
                variant="outline"
              >
                <UploadCloudIcon className="me-1.5 h-3.5 w-3.5" />
                {replaceLabel}
              </Button>
            </FileUploadTrigger>
          </FileUpload>
        </div>
      ) : (
        <FileUpload
          accept="image/*"
          className="flex items-center gap-2"
          disabled={isPending}
          maxFiles={1}
          maxSize={4 * 1024 * 1024}
          onUpload={onUpload}
        >
          <FileUploadTrigger asChild>
            <button
              className="flex cursor-pointer items-center gap-2 text-start"
              disabled={isPending}
              type="button"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted text-muted-foreground">
                <CameraIcon className="h-4 w-4" />
              </span>
              <Muted className="text-xs">{uploadPrompt}</Muted>
            </button>
          </FileUploadTrigger>
        </FileUpload>
      )}
    </div>
  );
}
