"use client";

import type { ReactNode } from "react";

import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from "@/components/ui/field";
import { useFieldContext } from "./hooks";

export type FormFieldProps = {
    label: string;
    description?: string;
    autoFocus?: boolean;
};

type FormBaseProps = FormFieldProps & {
    children: ReactNode;
    controlFirst?: boolean;
};

export function FormBase({
    children,
    label,
    description,
    controlFirst,
}: FormBaseProps) {
    const field = useFieldContext();
    const isInvalid =
        field.state.meta.isTouched && !field.state.meta.isValid;

    const errors = field.state.meta.errors.map((e) =>
        typeof e === "string" ? { message: e } : (e as { message?: string }),
    );

    const labelElement = (
        <>
            <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
        </>
    );

    const errorElement = isInvalid && <FieldError errors={errors} />;

    if (controlFirst) {
        return (
            <Field data-invalid={isInvalid} orientation="horizontal">
                {children}
                <FieldContent>
                    {labelElement}
                    {errorElement}
                </FieldContent>
            </Field>
        );
    }

    return (
        <Field data-invalid={isInvalid}>
            {labelElement}
            {children}
            {errorElement}
        </Field>
    );
}
