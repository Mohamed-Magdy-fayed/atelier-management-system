"use client";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";
import { useTranslation } from "@/features/core/i18n/client";

type SelectOption = {
  label: string;
  value: string;
};

type SelectManyFieldProps = {
  placeholder?: string;
  options: SelectOption[];
  setValue: (value: SelectOption[]) => void;
  value: SelectOption[];
};

export function SelectManyField({
  placeholder,
  options,
  setValue,
  value,
}: SelectManyFieldProps) {
  const anchor = useComboboxAnchor();
  const { t } = useTranslation();

  return (
    <Combobox
      autoHighlight
      isItemEqualToValue={(a, b) => a.value === b.value}
      items={options}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.label}
      multiple
      onValueChange={setValue}
      value={value}
    >
      <ComboboxChips className="w-full" ref={anchor}>
        <ComboboxValue>
          {(selectedValues: SelectOption[]) => (
            <>
              {selectedValues.map((option) => (
                <ComboboxChip key={option.value}>{option.label}</ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder={placeholder} />
              <InputGroupAddon align={"inline-end"}>
                <InputGroupButton
                  className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
                  data-slot="input-group-button"
                  render={<ComboboxTrigger />}
                  size="icon-xs"
                  variant="ghost"
                />
              </InputGroupAddon>
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>{t("common.noOptionsFound")}</ComboboxEmpty>
        <ComboboxList>
          {(item: SelectOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type SelectOneFieldProps = {
  placeholder?: string;
  options: SelectOption[];
  setValue: (value: SelectOption | null) => void;
  value: SelectOption | null;
};

export function SelectOneField({
  placeholder,
  options,
  setValue,
  value,
}: SelectOneFieldProps) {
  const { t } = useTranslation();

  return (
    <Combobox
      autoHighlight
      isItemEqualToValue={(a, b) => a.value === b.value}
      items={options}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => option.label}
      onValueChange={setValue}
      value={value}
    >
      <ComboboxInput placeholder={placeholder} />
      <ComboboxContent>
        <ComboboxEmpty>{t("common.noOptionsFound")}</ComboboxEmpty>
        <ComboboxList>
          {(item: SelectOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
