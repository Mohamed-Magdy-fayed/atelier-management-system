"use client";

import { CalendarIcon, XCircle } from "lucide-react";
import { type ComponentProps, useCallback, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { DateRangePresets } from "@/components/general/date-range-presets";
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
import { cn } from "@/lib/utils";

export type DateSelection = Date | Date[] | DateRange | undefined;

interface SelectDateFieldProps {
  value?: DateSelection;
  setValue: (value: DateSelection) => void;
  placeholder?: string;
  mode?: "single" | "multiple" | "range";
  disabled?: boolean;
  disabledDays?: ComponentProps<typeof Calendar>["disabled"];
  className?: string;
  title?: string;
  rangePresets?: DateRangePreset[];
}

function formatDate(date: Date, locale: string = "en-US"): string {
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
  value,
  setValue,
  placeholder,
  mode = "single",
  disabled = false,
  disabledDays,
  className,
  title,
  rangePresets = [],
}: SelectDateFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, t } = useTranslation();

  const onSelect = useCallback(
    (date: Date | Date[] | DateRange | undefined) => {
      setValue(date);
      if (mode === "single") {
        setIsOpen(false);
      }
    },
    [setValue, mode],
  );

  const hasValue = useMemo(() => {
    if (mode === "range") {
      const range = value as DateRange;
      return range?.from || range?.to;
    }
    if (mode === "multiple") {
      const dates = value as Date[];
      return dates && dates.length > 0;
    }
    return !!value;
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
      const range = value as DateRange;
      return formatDateRange(range, locale);
    }

    if (mode === "multiple") {
      const dates = value as Date[];
      return formatMultipleDates(dates, locale);
    }

    const singleDate = value as Date;
    return formatDate(singleDate, locale);
  }, [hasValue, value, mode, placeholder, locale, t]);

  const clearLabel = t("common.clearDate");

  const label = useMemo(() => {
    if (!title) return null;

    return (
      <span className="flex items-center gap-2">
        <span>{title}</span>
        {hasValue && (
          <>
            <Separator
              className="mx-0.5 data-[orientation=vertical]:h-4"
              orientation="vertical"
            />
            <span className="text-muted-foreground">{displayText}</span>
          </>
        )}
      </span>
    );
  }, [title, hasValue, displayText]);

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
                  onClick={(e) => {
                    e.stopPropagation();
                    setValue(undefined);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setValue(undefined);
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
      <PopoverContent align="start" className="w-auto p-0">
        {mode === "range" ? (
          <>
            <Calendar
              disabled={disabledDays}
              mode="range"
              numberOfMonths={2}
              onSelect={onSelect}
              selected={value as DateRange}
            />
            <DateRangePresets
              onSelect={(range) => {
                setValue({ from: range.from, to: range.to });
                setIsOpen(false);
              }}
              presets={rangePresets}
            />
          </>
        ) : mode === "multiple" ? (
          <Calendar
            disabled={disabledDays}
            mode="multiple"
            onSelect={onSelect}
            selected={value as Date[]}
          />
        ) : (
          <Calendar
            disabled={disabledDays}
            mode="single"
            onSelect={onSelect}
            selected={value as Date}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
