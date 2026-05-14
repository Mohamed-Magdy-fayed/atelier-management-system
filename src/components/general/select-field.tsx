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

  const labels = Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  );

  return (
    <Combobox
      autoHighlight
      items={options}
      multiple
      onValueChange={setValue}
      value={value}
    >
      <ComboboxChips className="w-full max-w-sm" ref={anchor}>
        <ComboboxValue>
          {(selectedValues) => (
            <>
              {selectedValues.map((value: string) => (
                <ComboboxChip key={value}>{labels[value]}</ComboboxChip>
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
            <ComboboxItem key={item.value} value={item.value}>
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
      items={options}
      itemToStringValue={(option) => option.label}
      onValueChange={setValue}
      value={value}
    >
      <ComboboxInput placeholder={placeholder} />
      <ComboboxContent>
        <ComboboxEmpty>{t("common.noOptionsFound")}</ComboboxEmpty>
        <ComboboxList>
          {(item: SelectOption) => (
            <ComboboxItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
