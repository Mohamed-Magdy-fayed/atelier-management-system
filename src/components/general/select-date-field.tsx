"use client";

import { CalendarIcon, XCircle } from "lucide-react";
import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { type DateRange, isDateRange } from "react-day-picker";
import { ar, enUS } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/features/core/i18n/client";
import type { DateRangePreset } from "@/lib/date-range";
import { toDate } from "@/lib/date-value";
import { cn } from "@/lib/utils";

export type DateSelection = Date | Date[] | DateRange | undefined;

type InlineRangePreset = {
  label: string;
  range: DateRange;
};

interface SelectDateFieldProps {
  /** Accepts loose values (date-only strings, timestamps) and coerces them. */
  value?: DateSelection | string | number | null;
  setValue: (value: DateSelection) => void;
  placeholder?: string;
  mode?: "single" | "multiple" | "range";
  disabled?: boolean;
  disabledDays?: ComponentProps<typeof Calendar>["disabled"];
  className?: string;
  title?: string;
  /** Legacy inline presets (label + range). */
  presets?: InlineRangePreset[];
  /** Factory presets used by filters and dashboard. */
  rangePresets?: DateRangePreset[];
  numberOfMonths?: number;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function areRangesEqual(a?: DateRange, b?: DateRange) {
  const fromEqual =
    (!a?.from && !b?.from) || (a?.from && b?.from && isSameDay(a.from, b.from));
  const toEqual =
    (!a?.to && !b?.to) || (a?.to && b?.to && isSameDay(a.to, b.to));
  return fromEqual && toEqual;
}

/**
 * Coerce a caller-provided selection into real `Date` objects. Form state can
 * hold date-only strings, so the raw value is not trustworthy as a `Date`.
 */
function normalizeSelection(
  value: unknown,
  mode: "single" | "multiple" | "range",
): DateSelection {
  if (value === undefined || value === null) {
    return mode === "multiple" ? [] : undefined;
  }

  if (mode === "range") {
    if (isDateRange(value)) {
      const from = toDate(value.from);
      const to = toDate(value.to);
      return from || to ? { from, to } : undefined;
    }
    const single = toDate(value);
    return single ? { from: single, to: undefined } : undefined;
  }

  if (mode === "multiple") {
    const list = Array.isArray(value) ? value : [value];
    return list
      .map((item) => toDate(item))
      .filter((item): item is Date => item !== undefined);
  }

  return toDate(value);
}

function formatDate(date: Date, locale: string = "en-US"): string {
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateRange(range: DateRange, locale: string = "en-US"): string {
  if (!range.from && !range.to) return "";
  if (range.from && range.to) {
    return `${formatDate(range.from, locale)} - ${formatDate(range.to, locale)}`;
  }
  const singleDate = range.from ?? range.to;
  return singleDate ? formatDate(singleDate, locale) : "";
}

function formatMultipleDates(dates: Date[], locale: string = "en-US"): string {
  if (dates.length === 0) return "";
  const firstDate = dates[0];
  if (!firstDate) return "";
  if (dates.length === 1) return formatDate(firstDate, locale);
  if (dates.length <= 3) {
    return dates.map((date) => formatDate(date, locale)).join(", ");
  }
  return `${formatDate(firstDate, locale)} +${dates.length - 1} more`;
}

export function SelectDateField({
  value: rawValue,
  setValue,
  placeholder,
  mode = "single",
  disabled = false,
  disabledDays,
  className,
  title,
  presets: presetsProp,
  rangePresets = [],
  numberOfMonths = 1,
}: SelectDateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, dir, t } = useTranslation();
  const rdpLocale = locale === "ar" ? ar : enUS;

  const value = useMemo(
    () => normalizeSelection(rawValue, mode),
    [rawValue, mode],
  );

  const presets = useMemo((): InlineRangePreset[] => {
    if (presetsProp?.length) return presetsProp;
    return rangePresets.map((preset) => ({
      label: preset.label,
      range: preset.getRange(),
    }));
  }, [presetsProp, rangePresets]);

  const onSelect = useCallback(
    (date: Date | Date[] | DateRange | undefined) => {
      setValue(date);
      if (mode === "single") {
        setIsOpen(false);
      }
    },
    [setValue, mode],
  );

  const onReset = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      setValue(undefined);
    },
    [setValue],
  );

  const hasValue = useMemo(() => {
    if (mode === "range") {
      const range = value as DateRange;
      return Boolean(range?.from || range?.to);
    }
    if (mode === "multiple") {
      return Array.isArray(value) && value.length > 0;
    }
    return Boolean(value);
  }, [mode, value]);

  const displayText = useMemo(() => {
    if (!hasValue) {
      if (placeholder) return placeholder;

      switch (mode) {
        case "range":
          return t("common.selectDateRange");
        case "multiple":
          return t("common.selectDates");
        default:
          return t("common.selectDate");
      }
    }

    if (mode === "range") {
      return formatDateRange(value as DateRange, locale);
    }

    if (mode === "multiple") {
      return formatMultipleDates(value as Date[], locale);
    }

    return formatDate(value as Date, locale);
  }, [hasValue, value, mode, placeholder, locale, t]);

  const clearLabel = t("common.clearDate");

  const label = useMemo(() => {
    if (!title) return null;

    return (
      <span className="flex items-center gap-2">
        <span>{title}</span>
        {hasValue ? (
          <>
            <Separator
              className="mx-0.5 data-[orientation=vertical]:h-4"
              orientation="vertical"
            />
            <span className="text-muted-foreground">{displayText}</span>
          </>
        ) : null}
      </span>
    );
  }, [title, hasValue, displayText]);

  const rangeValue =
    mode === "range" ? (value as DateRange | undefined) : undefined;
  const defaultMonth = rangeValue?.from ?? rangeValue?.to;

  const singleMonthClassNames =
    numberOfMonths === 1
      ? {
          months: "relative flex w-fit flex-col",
          month: "flex w-fit flex-col gap-4",
        }
      : undefined;

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger
        render={
          <Button
            className={cn(
              "w-full justify-start",
              title && "border-dashed",
              className,
            )}
            disabled={disabled}
            variant="outline"
          >
            <div className="flex w-full items-center gap-2">
              {hasValue && !disabled ? (
                <div
                  aria-label={clearLabel}
                  className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  onClick={onReset}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onReset(e as unknown as React.MouseEvent);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <XCircle className="h-4 w-4" />
                </div>
              ) : (
                <CalendarIcon className="h-4 w-4 shrink-0" />
              )}
              <span className="flex-1 truncate">{label || displayText}</span>
            </div>
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-min max-w-none gap-0 p-0 shadow-md"
      >
        {mode === "range" ? (
          <Calendar
            classNames={singleMonthClassNames}
            defaultMonth={defaultMonth}
            dir={dir}
            disabled={disabledDays || disabled}
            locale={rdpLocale}
            mode="range"
            numberOfMonths={numberOfMonths}
            onSelect={onSelect}
            selected={value as DateRange}
          />
        ) : mode === "multiple" ? (
          <Calendar
            dir={dir}
            disabled={disabledDays || disabled}
            locale={rdpLocale}
            mode="multiple"
            onSelect={onSelect}
            selected={value as Date[]}
          />
        ) : (
          <Calendar
            dir={dir}
            disabled={disabledDays || disabled}
            locale={rdpLocale}
            mode="single"
            onSelect={onSelect}
            selected={value as Date}
          />
        )}

        {mode === "range" && presets.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t px-4 py-3">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                className="flex-1"
                onClick={() => onSelect(preset.range)}
                size="sm"
                type="button"
                variant={
                  isDateRange(value) && areRangesEqual(preset.range, value)
                    ? "secondary"
                    : "ghost"
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
