"use client";

import PhoneInput, {
    type Country,
    parsePhoneNumber,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { ChevronDownIcon } from "lucide-react";
import { type ComponentProps, memo, useCallback, useMemo } from "react";

import {
    ButtonGroup,
    ButtonGroupSeparator,
} from "@/components/ui/button-group";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

const countryOptions = [
    { code: "EG", flagUrl: "/flags/eg.png" },
    { code: "MA", flagUrl: "/flags/ma.png" },
    { code: "TN", flagUrl: "/flags/tn.png" },
    { code: "DZ", flagUrl: "/flags/dz.png" },
    { code: "LY", flagUrl: "/flags/ly.png" },
    { code: "JO", flagUrl: "/flags/jo.png" },
    { code: "LB", flagUrl: "/flags/lb.png" },
    { code: "SY", flagUrl: "/flags/sy.png" },
    { code: "IQ", flagUrl: "/flags/iq.png" },
    { code: "SA", flagUrl: "/flags/sa.png" },
    { code: "AE", flagUrl: "/flags/ae.png" },
    { code: "KW", flagUrl: "/flags/kw.png" },
    { code: "OM", flagUrl: "/flags/om.png" },
    { code: "QA", flagUrl: "/flags/qa.png" },
    { code: "BH", flagUrl: "/flags/bh.png" },
    { code: "YE", flagUrl: "/flags/ye.png" },
];

const countryCodes = countryOptions.map((op) => op.code as Country);

interface MobileNumberInputProps {
    value: string;
    placeholder: string;
    inputProps?: ComponentProps<"input">;
    setValue: (val: string) => void;
    onError?: (isError: boolean) => void;
}

function PhoneContainer(props: ComponentProps<"div">) {
    return <InputGroup {...props} />;
}

function PhoneInputComponent(props: ComponentProps<"input">) {
    return (
        <InputGroupInput
            {...props}
            className={cn("rtl:text-end!", props.className)}
        />
    );
}

const CountrySelect = memo(function CountrySelect({
    onChange,
    value,
    iconComponent,
}: {
    onChange: (val: string) => void;
    value: string;
    iconComponent?: (props: { country: Country }) => React.ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <InputGroupAddon align="inline-end">
            <Select
                onValueChange={(selectedValue, _eventDetails) => {
                    if (selectedValue) {
                        onChange(selectedValue);
                    }
                }}
                value={value}
            >
                <ButtonGroup>
                    <div className="grid place-content-center">
                        {iconComponent?.({ country: value as Country })}
                    </div>
                    <ButtonGroupSeparator className="mx-2" />
                    <SelectTrigger
                        className="border-0 bg-transparent!"
                        render={
                            <InputGroupButton tabIndex={-1} variant="ghost">
                                {value}
                                <ChevronDownIcon />
                            </InputGroupButton>
                        }
                    />
                </ButtonGroup>
                <SelectContent align="end" className="w-min min-w-48">
                    {countryOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code} className="flex items-center">
                            <div className="flex items-center gap-2">
                                {iconComponent?.({
                                    country: option.code as Country,
                                })}
                                {t("countries", { country: option.code })}
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </InputGroupAddon>
    );
});

export const MobileNumberInput = memo(function MobileNumberInput({
    value,
    placeholder,
    inputProps,
    setValue,
    onError,
}: MobileNumberInputProps) {
    const handleChange = useCallback(
        (val: string | undefined) => {
            setValue(!val ? "" : val.toString().startsWith("+") ? val.slice(1) : val);

            if (val && onError) {
                const isInvalid = !parsePhoneNumber(val)?.isValid();
                onError(isInvalid);
            }
        },
        [setValue, onError],
    );

    const formattedValue = useMemo(() => (value ? `+${value}` : value), [value]);

    return (
        <PhoneInput
            addInternationalOption={false}
            autoComplete="off"
            containerComponent={PhoneContainer}
            countries={countryCodes}
            countrySelectComponent={CountrySelect}
            defaultCountry="EG"
            inputComponent={PhoneInputComponent}
            limitMaxLength={true}
            numberInputProps={inputProps}
            onChange={handleChange}
            placeholder={placeholder}
            value={formattedValue}
            initialValueFormat="national"
        />
    );
});
