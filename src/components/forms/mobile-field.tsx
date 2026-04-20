"use client";

import { useCallback, useMemo } from "react";

import { MobileNumberInput } from "@/components/general/mobile-input";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormMobileField({
    placeholder,
    autoFocus,
    ...props
}: FormFieldProps & { placeholder?: string }) {
    const field = useFieldContext<string>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    const handleChange = useCallback(
        (val: string) => field.handleChange(val),
        [field.handleChange],
    );

    const inputProps = useMemo(
        () => ({
            id: field.name,
            name: field.name,
            onBlur: field.handleBlur,
            "aria-invalid": isInvalid,
            autoFocus,
            className: "",
        }),
        [field.name, field.handleBlur, isInvalid, autoFocus],
    );

    return (
        <FormBase {...props}>
            <MobileNumberInput
                inputProps={inputProps}
                placeholder={placeholder ?? "011 12345678"}
                setValue={handleChange}
                value={field.state.value}
            />
        </FormBase>
    );
}
