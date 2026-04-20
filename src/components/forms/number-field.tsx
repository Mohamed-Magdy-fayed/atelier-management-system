"use client";

import { Input } from "@/components/ui/input";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormNumberField({
    placeholder,
    autoFocus,
    ...props
}: FormFieldProps & { placeholder?: string }) {
    const field = useFieldContext<number>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <FormBase {...props}>
            <Input
                aria-invalid={isInvalid}
                autoComplete="off"
                autoFocus={autoFocus}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                placeholder={placeholder}
                type="number"
                value={field.state.value}
            />
        </FormBase>
    );
}
