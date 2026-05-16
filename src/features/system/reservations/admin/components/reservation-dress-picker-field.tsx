"use client";

import { EyeIcon } from "lucide-react";
import { useCallback, useMemo } from "react";

import { FormBase, type FormFieldProps } from "@/components/forms/form-base";
import { useFieldContext } from "@/components/forms/hooks";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";
import { useTranslation } from "@/features/core/i18n/client";
import { DressViewDialog } from "@/features/system/dresses/admin/components/dress-view-dialog";

type DressOption = {
  value: string;
  label: string;
};

type ReservationDressPickerFieldProps = FormFieldProps & {
  options: DressOption[];
  placeholder?: string;
  disabled?: boolean;
};

export function ReservationDressPickerField({
  options,
  placeholder,
  disabled = false,
  ...props
}: ReservationDressPickerFieldProps) {
  const field = useFieldContext<string>();
  const { t } = useTranslation();

  const selected = useMemo(
    () => options.find((o) => o.value === field.state.value) ?? null,
    [options, field.state.value],
  );

  const setValue = useCallback(
    (opt: DressOption | null) => {
      field.handleChange(opt?.value ?? "");
    },
    [field],
  );

  return (
    <FormBase {...props}>
      <Combobox
        autoHighlight
        disabled={disabled}
        isItemEqualToValue={(a, b) => a.value === b.value}
        items={options}
        itemToStringLabel={(option) => option.label}
        itemToStringValue={(option) => option.label}
        onValueChange={setValue}
        value={selected}
      >
        <ComboboxInput
          className="w-full"
          placeholder={placeholder}
          showClear={false}
        >
          <InputGroupAddon align="inline-end">
            <DressViewDialog
              dressId={field.state.value}
              dressLabel={selected?.label}
              trigger={
                <InputGroupButton
                  aria-label={String(t("systemPages.reservationsViewDress"))}
                  disabled={!field.state.value}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <EyeIcon className="size-3.5" />
                </InputGroupButton>
              }
            />
          </InputGroupAddon>
        </ComboboxInput>
        <ComboboxContent>
          <ComboboxEmpty>{t("common.noOptionsFound")}</ComboboxEmpty>
          <ComboboxList>
            {(item: DressOption) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </FormBase>
  );
}
