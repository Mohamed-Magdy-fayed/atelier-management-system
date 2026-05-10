"use client";

import { useMutation } from "@tanstack/react-query";
import { ImageUpIcon, UploadCloudIcon } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";
import type { FileUploadProps } from "@/components/ui/file-upload";
import { FileUpload, FileUploadTrigger } from "@/components/ui/file-upload";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";
import { useTRPC } from "@/integrations/trpc/client";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormImageField({
    placeholder,
    autoFocus,
    ...props
}: FormFieldProps & { placeholder?: string }) {
    const field = useFieldContext<string | null>();
    const trpc = useTRPC();
    const { mutateAsync: uploadImage, isPending: isUploading } = useMutation(
        trpc.uploadImage.mutationOptions(),
    );
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
        async (files, options) => {
            for (const file of files) {
                try {
                    options.onProgress(file, 20);
                    const previousImageUrl = field.state.value ?? null;

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
                        oldUrl: previousImageUrl,
                    });

                    if (!payload?.url) {
                        throw new Error("Upload failed");
                    }

                    const uploadedUrl = payload.url.startsWith("http")
                        ? payload.url
                        : new URL(payload.url, window.location.origin).toString();

                    options.onProgress(file, 100);
                    options.onSuccess(file);
                    field.setValue(uploadedUrl);
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
        [field, uploadImage],
    );

    return (
        <FormBase {...props}>
            <FileUpload
                accept="image/*"
                maxFiles={1}
                maxSize={4 * 1024 * 1024}
                className="w-full flex items-center gap-2"
                onUpload={onUpload}
                disabled={isUploading}
            >
                <InputGroup>
                    <InputGroupAddon>
                        <ImageUpIcon />
                    </InputGroupAddon>
                    <InputGroupInput
                        aria-invalid={isInvalid}
                        autoComplete="off"
                        autoFocus={autoFocus}
                        id={field.name}
                        name={field.name}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                            field.handleChange(e.target.value ? e.target.value : null)
                        }
                        placeholder={placeholder}
                        value={field.state.value ?? ""}
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton
                            size="icon-xs"
                            render={
                                <FileUploadTrigger>
                                    <UploadCloudIcon />
                                </FileUploadTrigger>
                            }
                        />
                    </InputGroupAddon>
                </InputGroup>
            </FileUpload>
        </FormBase>
    );
}
