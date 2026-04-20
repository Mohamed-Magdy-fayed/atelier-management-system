"use client";

import { Switch } from "@/components/ui/switch";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormBooleanField({ autoFocus, ...props }: FormFieldProps) {
    const field = useFieldContext<boolean>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <FormBase {...props} controlFirst>
            <Switch
                aria-invalid={isInvalid}
                autoFocus={autoFocus}
                checked={field.state.value}
                id={field.name}
                name={field.name}
                onBlur={field.handleBlur}
                onCheckedChange={(checked) => field.handleChange(checked === true)}
            />
        </FormBase>
    );
}
