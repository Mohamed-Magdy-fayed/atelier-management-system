"use client";

import {
  type DateSelection,
  SelectDateField,
} from "@/components/general/select-date-field";
import type { Calendar } from "@/components/ui/calendar";
import type { DateRangePreset } from "@/lib/date-range";
import { isValidDate, toDateOnlyString } from "@/lib/date-value";
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
  const fieldValue = field.state.value;

  // Some forms store single dates as `"YYYY-MM-DD"` strings (Postgres `date`
  // columns). Keep that shape on write so schema validation still passes.
  const isDateOnlyString = mode === "single" && typeof fieldValue === "string";

  const handleChange = (next: DateSelection) => {
    if (!isDateOnlyString) {
      field.handleChange(next);
      return;
    }
    field.handleChange(isValidDate(next) ? toDateOnlyString(next) : "");
  };

  return (
    <FormBase {...props}>
      <SelectDateField
        disabled={disabled}
        disabledDays={disabledDays}
        mode={mode}
        placeholder={placeholder}
        rangePresets={rangePresets}
        setValue={handleChange}
        title={title ?? props.label}
        value={fieldValue as DateSelection | string | number | null}
      />
    </FormBase>
  );
}
