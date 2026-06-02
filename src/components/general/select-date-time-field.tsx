"use client";

import { CalendarIcon } from "lucide-react";
import { type ComponentProps, useCallback, useMemo, useState } from "react";
import { ar, enUS } from "react-day-picker/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function applyTimeToDate(date: Date, timeValue: string): Date {
  const [h, m] = timeValue.split(":").map(Number);
  const next = new Date(date);
  next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return next;
}

type SelectDateTimeFieldProps = {
  value?: Date;
  setValue: (value: Date) => void;
  placeholder?: string;
  title?: string;
  disabled?: boolean;
  disabledDays?: ComponentProps<typeof Calendar>["disabled"];
  className?: string;
};

export function SelectDateTimeField({
  value,
  setValue,
  placeholder,
  title,
  disabled = false,
  disabledDays,
  className,
}: SelectDateTimeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { locale, dir, t } = useTranslation();
  const rdpLocale = locale === "ar" ? ar : enUS;
  const intlLocale = locale === "ar" ? "ar" : "en";

  const hasValue = Boolean(value);

  const displayText = useMemo(() => {
    if (!hasValue || !value) {
      return placeholder ?? t("common.selectDate");
    }
    return `${formatDate(value, intlLocale)} · ${formatTime(value, intlLocale)}`;
  }, [hasValue, value, placeholder, intlLocale, t]);

  const onDateSelect = useCallback(
    (date: Date | undefined) => {
      if (!date) return;
      const base = value ?? new Date();
      setValue(applyTimeToDate(date, toTimeInputValue(base)));
    },
    [setValue, value],
  );

  const onTimeChange = useCallback(
    (timeValue: string) => {
      const base = value ?? new Date();
      setValue(applyTimeToDate(base, timeValue));
    },
    [setValue, value],
  );

  const label = useMemo(() => {
    if (!title) return null;
    return (
      <span className="flex items-center gap-2">
        <span>{title}</span>
        {hasValue && value ? (
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
  }, [title, hasValue, value, displayText]);

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
            type="button"
            variant="outline"
          >
            <div className="flex w-full items-center gap-2">
              <CalendarIcon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-start">
                {label || displayText}
              </span>
            </div>
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-auto gap-0 p-0 shadow-md"
      >
        <Calendar
          dir={dir}
          disabled={disabledDays || disabled}
          locale={rdpLocale}
          mode="single"
          onSelect={onDateSelect}
          selected={value}
        />
        <div className="space-y-2 border-t border-border px-3 py-3">
          <Label className="text-muted-foreground text-xs">
            {t("common.selectTime")}
          </Label>
          <Input
            disabled={disabled}
            onChange={(e) => onTimeChange(e.target.value)}
            type="time"
            value={value ? toTimeInputValue(value) : ""}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
