"use client";

import { CalendarIcon } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { ar, enUS } from "react-day-picker/locale";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/features/core/i18n/client";
import { checkDressAvailabilityAction } from "@/features/public-catalog/server/actions";
import { NEXT_AVAILABLE_SCAN_DAYS } from "@/features/public-catalog/server/constants";
import { cn } from "@/lib/utils";

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function DressAvailabilityChecker({
  dressId,
  branchLabel,
}: {
  dressId: string;
  branchLabel: string;
}) {
  const { t, locale, dir } = useTranslation();
  const rdpLocale = locale === "ar" ? ar : enUS;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | undefined>();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "ok"; available: boolean; next: string | null }
    | { kind: "past" }
    | { kind: "badResponse" }
  >({ kind: "idle" });

  const today = useMemo(() => startOfToday(), []);

  function runCheck() {
    if (!selected) return;
    if (selected < today) {
      setResult({ kind: "past" });
      return;
    }

    startTransition(async () => {
      const res = await checkDressAvailabilityAction({
        dressId,
        date: toYMD(selected),
      });
      if (!res.ok) {
        setResult({ kind: "badResponse" });
        return;
      }
      setResult({
        kind: "ok",
        available: res.available,
        next: res.nextAvailable,
      });
    });
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/30 p-5">
      <div>
        <h3 className="font-medium text-lg tracking-tight">
          {String(t("publicCatalog.availabilityTitle"))}
        </h3>
        <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
          {String(t("publicCatalog.availabilityLead"))}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {String(t("publicCatalog.pickDate"))}
          </p>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal sm:w-[240px]",
                    !selected && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 size-4" />
                  {selected
                    ? selected.toLocaleDateString(
                        locale === "ar" ? "ar-EG" : "en-EG",
                      )
                    : String(t("common.selectDate"))}
                </Button>
              }
            />
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                dir={dir}
                locale={rdpLocale}
                mode="single"
                selected={selected}
                disabled={{ before: today }}
                onSelect={(d) => {
                  setSelected(d);
                  setResult({ kind: "idle" });
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button
          type="button"
          disabled={!selected || pending}
          onClick={() => runCheck()}
          className="sm:mb-0.5"
        >
          {pending
            ? String(t("common.loading"))
            : String(t("publicCatalog.checkAvailability"))}
        </Button>
      </div>

      {result.kind === "past" ? (
        <Alert variant="destructive">
          <AlertTitle>
            {String(t("publicCatalog.availabilityHintPast"))}
          </AlertTitle>
        </Alert>
      ) : null}

      {result.kind === "badResponse" ? (
        <Alert variant="destructive">
          <AlertTitle>{String(t("publicCatalog.checkFailed"))}</AlertTitle>
        </Alert>
      ) : null}

      {result.kind === "ok" ? (
        <Alert variant={result.available ? "default" : "destructive"}>
          <AlertTitle>
            {result.available
              ? String(t("publicCatalog.availabilityAvailable"))
              : String(t("publicCatalog.availabilityUnavailable"))}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              {String(
                t("publicCatalog.availabilityVisitBranch", {
                  branch: branchLabel,
                }),
              )}
            </p>
            {!result.available && result.next ? (
              <p className="text-muted-foreground text-sm">
                {String(t("publicCatalog.nextAvailableHint"))}:{" "}
                <span className="font-medium text-foreground">
                  {result.next}
                </span>
              </p>
            ) : null}
            {!result.available && !result.next ? (
              <p className="text-muted-foreground text-sm">
                {String(
                  t("publicCatalog.nextAvailableNone", {
                    days: NEXT_AVAILABLE_SCAN_DAYS,
                  }),
                )}
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
