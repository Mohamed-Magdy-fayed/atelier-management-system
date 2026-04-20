"use client";

import {
    type DateSelection,
    SelectDateField,
} from "@/components/general/select-date-field";
import type { Calendar } from "@/components/ui/calendar";
import type { DateRangePreset } from "@/lib/date-range";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

type FormDateFieldProps = FormFieldProps & {
    placeholder?: string;
    title?: string;
    mode?: "single" | "multiple" | "range";
    disabled?: boolean;
    disabledDays?: React.ComponentProps<typeof Calendar>["disabled"];
    rangePresets?: DateRangePreset[];
};

export function FormDateField({
    placeholder,
    title,
    mode = "single",
    disabled,
    disabledDays,
    rangePresets,
    ...props
}: FormDateFieldProps) {
    const field = useFieldContext();

    return (
        <FormBase {...props}>
            <SelectDateField
                disabled={disabled}
                disabledDays={disabledDays}
                mode={mode}
                placeholder={placeholder}
                rangePresets={rangePresets}
                setValue={(val) => field.handleChange(val)}
                title={title ?? props.label}
                value={field.state.value as DateSelection}
            />
        </FormBase>
    );
}
