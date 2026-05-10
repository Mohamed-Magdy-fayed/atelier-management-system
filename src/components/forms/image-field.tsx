"use client";

import { ImageUpIcon, UploadCloudIcon } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import {
    FileUpload,
    FileUploadProps,
    FileUploadTrigger,
} from "@/components/ui/file-upload";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export function FormImageField({
    placeholder,
    autoFocus,
    ...props
}: FormFieldProps & { placeholder?: string }) {
    const field = useFieldContext<string | null>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;


    // const { isUploading, routeConfig, startUpload } = useUploadThing("imageUploader");

    // const onUpload: NonNullable<FileUploadProps["onUpload"]> = useCallback(
    //     async (files) => {
    //         try {
    //             routeConfig
    //             const res = await startUpload(files);
    //             if (res?.[0]?.serverData?.url) {
    //                 field.setValue(res[0].serverData.url);
    //             } else {
    //                 toast.error("Upload failed: No URL returned");
    //             }
    //         } catch (error) {
    //             if (error instanceof UploadThingError) {
    //                 const errorMessage =
    //                     error.data && "error" in error.data
    //                         ? error.data.error
    //                         : "Upload failed";
    //                 toast.error(errorMessage);
    //                 return;
    //             }

    //             toast.error(
    //                 error instanceof Error ? error.message : "An unknown error occurred",
    //             );
    //         }
    //     },
    //     [],
    // );

    return (
        <FormBase {...props}>
            <FileUpload
                accept="image/*"
                maxFiles={1}
                maxSize={4 * 1024 * 1024}
                className="w-full flex items-center gap-2"
            // onUpload={onUpload}
            // disabled={isUploading}
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
                        onChange={(e) => field.handleChange(!!e.target.value ? e.target.value : null)}
                        placeholder={placeholder}
                        value={field.state.value ?? ""}
                    />
                    <InputGroupAddon align="inline-end">
                        <InputGroupButton size="icon-xs" render={(
                            <FileUploadTrigger>
                                <UploadCloudIcon />
                            </FileUploadTrigger>
                        )} />
                    </InputGroupAddon>
                </InputGroup>
            </FileUpload>
        </FormBase>
    );
}
