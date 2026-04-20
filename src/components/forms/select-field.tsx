"use client";

import { useCallback } from "react";

import {
    SelectManyField,
    SelectOneField,
} from "@/components/general/select-field";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

type SelectOption = {
    value: string;
    label: string;
};

type FormSelectFieldProps = FormFieldProps & {
    options: SelectOption[];
    placeholder?: string;
    multiple?: boolean;
};

export function FormSelectField({
    options,
    placeholder,
    multiple,
    ...props
}: FormSelectFieldProps) {
    const field = useFieldContext();

    const setSingleValue = useCallback(
        (val: string | null) => field.handleChange(val ?? ""),
        [field.handleChange],
    );

    const setMultipleValue = useCallback(
        (val: string[] | null) => field.handleChange(val ?? []),
        [field.handleChange],
    );

    if (multiple) {
        return (
            <FormBase {...props}>
                <SelectManyField
                    options={options}
                    placeholder={placeholder}
                    setValue={(val) => setMultipleValue(val.map(item => item.value))}
                    value={(field.state.value as string[]).map(val => ({ value: val, label: val }))}
                />
            </FormBase>
        );
    }

    return (
        <FormBase {...props}>
            <SelectOneField
                options={options}
                placeholder={placeholder}
                setValue={(val) => setSingleValue(val?.value ?? null)}
                value={{ value: field.state.value as string, label: field.state.value as string }}
            />
        </FormBase>
    );
}
