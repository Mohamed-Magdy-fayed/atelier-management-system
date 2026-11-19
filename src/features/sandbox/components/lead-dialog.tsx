"use client";

import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/features/core/i18n/client";

import {
  CONTACT_CHANNEL_VALUES,
  type LeadSubmission,
  leadSubmissionSchema,
  leadToWhatsappText,
  PRICE_REACTION_VALUES,
  WORKAROUND_VALUES,
  whatsappUrl,
} from "../lib/lead";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchAdded: boolean;
  dressAdded: boolean;
};

type Phase =
  | { kind: "form" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "fallback"; message: string };

const WORKAROUND_LABELS = {
  notebook: "sandbox.lead.workaroundNotebook",
  excel: "sandbox.lead.workaroundExcel",
  whatsapp: "sandbox.lead.workaroundWhatsapp",
  software: "sandbox.lead.workaroundSoftware",
  nothing: "sandbox.lead.workaroundNothing",
} as const;

const PRICE_LABELS = {
  fair: "sandbox.lead.priceFair",
  expensive: "sandbox.lead.priceExpensive",
  think: "sandbox.lead.priceThink",
} as const;

const CONTACT_LABELS = {
  whatsapp: "sandbox.lead.contactWhatsapp",
  call: "sandbox.lead.contactCall",
} as const;

function deviceClass(): LeadSubmission["sandbox"]["device"] {
  const width = window.innerWidth;
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function optionalNumber(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function LeadDialog({
  open,
  onOpenChange,
  branchAdded,
  dressAdded,
}: Props) {
  const { t, locale, dir } = useTranslation();
  const idempotencyKey = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [error, setError] = useState<string | null>(null);
  const [workaround, setWorkaround] = useState<
    Array<(typeof WORKAROUND_VALUES)[number]>
  >([]);
  const [priceReaction, setPriceReaction] = useState<
    (typeof PRICE_REACTION_VALUES)[number] | undefined
  >(undefined);
  const [contactChannel, setContactChannel] =
    useState<(typeof CONTACT_CHANNEL_VALUES)[number]>("whatsapp");
  const [consent, setConsent] = useState(false);

  function toggleWorkaround(value: (typeof WORKAROUND_VALUES)[number]) {
    setWorkaround((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const read = (key: string) => String(form.get(key) ?? "");

    if (!consent) {
      setError(String(t("sandbox.lead.consentError")));
      return;
    }

    idempotencyKey.current ??= crypto.randomUUID();
    const candidate = {
      idempotencyKey: idempotencyKey.current,
      locale: locale === "ar" ? "ar" : "en",
      website: read("website"),
      consent: { contact: consent, storage: consent },
      business: {
        ownerName: read("ownerName"),
        name: read("name"),
        phone: read("phone"),
        city: read("city") || undefined,
        branches: optionalNumber(read("branches")),
        dresses: optionalNumber(read("dresses")),
      },
      answers: {
        workaround,
        lastIncident: read("incident") || undefined,
        priceReaction,
        contactChannel,
      },
      social: read("social") || undefined,
      sandbox: { branchAdded, dressAdded, device: deviceClass() },
    };

    const parsed = leadSubmissionSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(String(t("sandbox.lead.requiredError")));
      return;
    }

    setPhase({ kind: "sending" });
    try {
      const response = await fetch("/api/sandbox/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.ok) {
        setPhase({ kind: "sent" });
        return;
      }
      setPhase({ kind: "fallback", message: leadToWhatsappText(parsed.data) });
    } catch {
      setPhase({ kind: "fallback", message: leadToWhatsappText(parsed.data) });
    }
  }

  const sending = phase.kind === "sending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" dir={dir}>
        {phase.kind === "sent" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {String(t("sandbox.lead.successTitle"))}
              </DialogTitle>
              <DialogDescription>
                {String(t("sandbox.lead.successBody"))}
              </DialogDescription>
            </DialogHeader>
            <Button type="button" onClick={() => onOpenChange(false)}>
              {String(t("sandbox.lead.close"))}
            </Button>
          </>
        ) : phase.kind === "fallback" ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {String(t("sandbox.lead.fallbackTitle"))}
              </DialogTitle>
              <DialogDescription>
                {String(t("sandbox.lead.fallbackBody"))}
              </DialogDescription>
            </DialogHeader>
            <Button
              nativeButton={false}
              render={
                // biome-ignore lint/a11y/useAnchorContent: Button supplies the link text through its children
                <a
                  href={whatsappUrl(phase.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {String(t("sandbox.lead.sendWhatsapp"))}
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{String(t("sandbox.lead.title"))}</DialogTitle>
              <DialogDescription>
                {String(t("sandbox.lead.intro"))}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pe-1"
            >
              <div className="space-y-1.5">
                <Label htmlFor="lead-owner">
                  {String(t("sandbox.lead.ownerName"))}
                </Label>
                <Input
                  id="lead-owner"
                  name="ownerName"
                  autoComplete="name"
                  required
                  maxLength={160}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-name">
                  {String(t("sandbox.lead.name"))}
                </Label>
                <Input id="lead-name" name="name" required maxLength={160} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-phone">
                  {String(t("sandbox.lead.phone"))}
                </Label>
                {/* Phone numbers read left to right in both languages. */}
                <Input
                  id="lead-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  required
                  placeholder="01xxxxxxxxx"
                />
                <p className="text-muted-foreground">
                  {String(t("sandbox.lead.phoneHint"))}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lead-city">
                  {String(t("sandbox.lead.city"))}
                </Label>
                <Input id="lead-city" name="city" maxLength={160} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lead-branches">
                    {String(t("sandbox.lead.branches"))}
                  </Label>
                  <Input
                    id="lead-branches"
                    name="branches"
                    type="number"
                    inputMode="numeric"
                    min={0}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lead-dresses">
                    {String(t("sandbox.lead.dresses"))}
                  </Label>
                  <Input
                    id="lead-dresses"
                    name="dresses"
                    type="number"
                    inputMode="numeric"
                    min={0}
                  />
                </div>
              </div>

              <fieldset className="space-y-2">
                <legend className="font-medium">
                  {String(t("sandbox.lead.workaround"))}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {WORKAROUND_VALUES.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={
                        workaround.includes(value) ? "default" : "outline"
                      }
                      aria-pressed={workaround.includes(value)}
                      onClick={() => toggleWorkaround(value)}
                    >
                      {String(t(WORKAROUND_LABELS[value]))}
                    </Button>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="lead-incident">
                  {String(t("sandbox.lead.incident"))}
                </Label>
                <Textarea
                  id="lead-incident"
                  name="incident"
                  rows={3}
                  maxLength={2000}
                  placeholder={String(t("sandbox.lead.incidentHint"))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lead-social">
                  {String(t("sandbox.lead.social"))}
                </Label>
                <Input
                  id="lead-social"
                  name="social"
                  dir="ltr"
                  maxLength={300}
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="font-medium">
                  {String(t("sandbox.lead.contactPreference"))}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_CHANNEL_VALUES.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={contactChannel === value ? "default" : "outline"}
                      aria-pressed={contactChannel === value}
                      onClick={() => setContactChannel(value)}
                    >
                      {String(t(CONTACT_LABELS[value]))}
                    </Button>
                  ))}
                </div>
              </fieldset>

              <fieldset className="space-y-2">
                <legend className="font-medium">
                  {String(t("sandbox.lead.priceReaction"))}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {PRICE_REACTION_VALUES.map((value) => (
                    <Button
                      key={value}
                      type="button"
                      size="sm"
                      variant={priceReaction === value ? "default" : "outline"}
                      aria-pressed={priceReaction === value}
                      onClick={() => setPriceReaction(value)}
                    >
                      {String(t(PRICE_LABELS[value]))}
                    </Button>
                  ))}
                </div>
              </fieldset>

              {/* Honeypot: hidden from people, tempting to bots. */}
              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute h-0 w-0 opacity-0"
              />

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>{String(t("sandbox.lead.consent"))}</span>
              </label>

              {error ? (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" disabled={sending}>
                {sending
                  ? String(t("sandbox.lead.sending"))
                  : String(t("sandbox.lead.submit"))}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
