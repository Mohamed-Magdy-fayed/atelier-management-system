"use client";

import { type FormEvent, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
      <DialogContent className="gap-0 p-0 sm:max-w-lg" dir={dir}>
        {phase.kind === "sent" ? (
          <>
            <DialogHeader className="p-6 pb-4 pe-12">
              <DialogTitle>
                {String(t("sandbox.lead.successTitle"))}
              </DialogTitle>
              <DialogDescription>
                {String(t("sandbox.lead.successBody"))}
              </DialogDescription>
            </DialogHeader>
            <Button
              type="button"
              className="mx-6 mb-6"
              onClick={() => onOpenChange(false)}
            >
              {String(t("sandbox.lead.close"))}
            </Button>
          </>
        ) : phase.kind === "fallback" ? (
          <>
            <DialogHeader className="p-6 pb-4 pe-12">
              <DialogTitle>
                {String(t("sandbox.lead.fallbackTitle"))}
              </DialogTitle>
              <DialogDescription>
                {String(t("sandbox.lead.fallbackBody"))}
              </DialogDescription>
            </DialogHeader>
            <Button
              className="mx-6 mb-6"
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
            <DialogHeader className="p-6 pb-4 pe-12">
              <DialogTitle>{String(t("sandbox.lead.title"))}</DialogTitle>
              <DialogDescription>
                {String(t("sandbox.lead.intro"))}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              {/* Padded scroll body: the px/py gutter keeps focus rings (2px)
                  and the scrollbar clear of the field edges. */}
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-1 [scrollbar-gutter:stable]">
                <FieldGroup className="gap-5 pb-4">
                  <Field>
                    <FieldLabel htmlFor="lead-owner">
                      {String(t("sandbox.lead.ownerName"))}
                    </FieldLabel>
                    <Input
                      id="lead-owner"
                      name="ownerName"
                      autoComplete="name"
                      required
                      maxLength={160}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lead-name">
                      {String(t("sandbox.lead.name"))}
                    </FieldLabel>
                    <Input
                      id="lead-name"
                      name="name"
                      required
                      maxLength={160}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lead-phone">
                      {String(t("sandbox.lead.phone"))}
                    </FieldLabel>
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
                    <FieldDescription>
                      {String(t("sandbox.lead.phoneHint"))}
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="lead-city">
                      {String(t("sandbox.lead.city"))}
                    </FieldLabel>
                    <Input id="lead-city" name="city" maxLength={160} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="lead-branches">
                        {String(t("sandbox.lead.branches"))}
                      </FieldLabel>
                      <Input
                        id="lead-branches"
                        name="branches"
                        type="number"
                        inputMode="numeric"
                        min={0}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="lead-dresses">
                        {String(t("sandbox.lead.dresses"))}
                      </FieldLabel>
                      <Input
                        id="lead-dresses"
                        name="dresses"
                        type="number"
                        inputMode="numeric"
                        min={0}
                      />
                    </Field>
                  </div>

                  <FieldSet className="gap-2">
                    <FieldLegend variant="label" className="mb-0">
                      {String(t("sandbox.lead.workaround"))}
                    </FieldLegend>
                    <ToggleGroup
                      multiple
                      value={workaround}
                      onValueChange={(next) =>
                        setWorkaround(
                          next as Array<(typeof WORKAROUND_VALUES)[number]>,
                        )
                      }
                    >
                      {WORKAROUND_VALUES.map((value) => (
                        <ToggleGroupItem key={value} value={value} size="sm">
                          {String(t(WORKAROUND_LABELS[value]))}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FieldSet>

                  <Field>
                    <FieldLabel htmlFor="lead-incident">
                      {String(t("sandbox.lead.incident"))}
                    </FieldLabel>
                    <Textarea
                      id="lead-incident"
                      name="incident"
                      rows={3}
                      maxLength={2000}
                      placeholder={String(t("sandbox.lead.incidentHint"))}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="lead-social">
                      {String(t("sandbox.lead.social"))}
                    </FieldLabel>
                    <Input
                      id="lead-social"
                      name="social"
                      dir="ltr"
                      maxLength={300}
                    />
                  </Field>

                  <FieldSet className="gap-2">
                    <FieldLegend variant="label" className="mb-0">
                      {String(t("sandbox.lead.contactPreference"))}
                    </FieldLegend>
                    <ToggleGroup
                      value={[contactChannel]}
                      onValueChange={(next) => {
                        const [first] = next;
                        if (first)
                          setContactChannel(
                            first as (typeof CONTACT_CHANNEL_VALUES)[number],
                          );
                      }}
                    >
                      {CONTACT_CHANNEL_VALUES.map((value) => (
                        <ToggleGroupItem key={value} value={value} size="sm">
                          {String(t(CONTACT_LABELS[value]))}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FieldSet>

                  <FieldSet className="gap-2">
                    <FieldLegend variant="label" className="mb-0">
                      {String(t("sandbox.lead.priceReaction"))}
                    </FieldLegend>
                    <ToggleGroup
                      value={priceReaction ? [priceReaction] : []}
                      onValueChange={(next) => {
                        const [first] = next;
                        setPriceReaction(
                          first as
                            | (typeof PRICE_REACTION_VALUES)[number]
                            | undefined,
                        );
                      }}
                    >
                      {PRICE_REACTION_VALUES.map((value) => (
                        <ToggleGroupItem key={value} value={value} size="sm">
                          {String(t(PRICE_LABELS[value]))}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </FieldSet>

                  {/* Honeypot: hidden from people, tempting to bots. */}
                  <input
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute h-0 w-0 opacity-0"
                  />
                </FieldGroup>
              </div>

              <div className="flex flex-col gap-3 border-t px-6 pt-4 pb-6">
                <Field orientation="horizontal">
                  <Checkbox
                    id="lead-consent"
                    checked={consent}
                    onCheckedChange={(checked) => setConsent(checked === true)}
                  />
                  <FieldLabel htmlFor="lead-consent" className="font-normal">
                    {String(t("sandbox.lead.consent"))}
                  </FieldLabel>
                </Field>

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
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
