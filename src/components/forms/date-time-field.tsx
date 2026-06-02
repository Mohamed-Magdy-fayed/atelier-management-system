"use client";

import type { ComponentProps } from "react";
import { SelectDateTimeField } from "@/components/general/select-date-time-field";

import type { Calendar } from "@/components/ui/calendar";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

type FormDateTimeFieldProps = FormFieldProps & {
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  disabledDays?: ComponentProps<typeof Calendar>["disabled"];
};

export function FormDateTimeField({
  placeholder,
  title,
  disabled = false,
  disabledDays,
  ...props
}: FormDateTimeFieldProps) {
  const field = useFieldContext<Date>();

  return (
    <FormBase {...props}>
      <SelectDateTimeField
        disabled={disabled}
        disabledDays={disabledDays}
        placeholder={placeholder}
        setValue={(val) => field.handleChange(val)}
        title={title ?? props.label}
        value={field.state.value}
      />
    </FormBase>
  );
}
