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
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { useTranslation } from "@/features/core/i18n/client";
import { DressViewDialog } from "@/features/system/dresses/admin/components/dress-view-dialog";

export type DressOption = {
  value: string;
  label: string;
};

type DressPickerFieldProps = FormFieldProps & {
  options: DressOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Show a clear button — for forms where the dress is optional. */
  clearable?: boolean;
};

/**
 * Searchable dress selector with an inline preview dialog. Shared by every
 * form that picks a dress so the interaction stays identical across the app.
 */
export function DressPickerField({
  options,
  placeholder,
  disabled = false,
  clearable = false,
  ...props
}: DressPickerFieldProps) {
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
          placeholder={placeholder ?? String(t("systemPages.searchDress"))}
          showClear={clearable}
        >
          <InputGroupAddon align="inline-end">
            <DressViewDialog
              dressId={field.state.value}
              dressLabel={selected?.label}
              trigger={
                <InputGroupButton
                  aria-label={String(t("systemPages.viewDress"))}
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
