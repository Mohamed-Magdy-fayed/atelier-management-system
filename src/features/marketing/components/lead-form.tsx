"use client";

import { type FormEvent, useState } from "react";

import type { MarketingCopy, MarketingLocale } from "../content";

/**
 * No backend yet: the lead goes out as a pre-filled WhatsApp message to the
 * sales number. That keeps v1 free of a database table and of a signup that
 * would create tenants before tenant isolation exists.
 */
export function LeadForm({
  copy,
  locale,
  whatsappNumber,
}: {
  copy: MarketingCopy["form"];
  locale: MarketingLocale;
  whatsappNumber?: string;
}) {
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const get = (k: string) => String(data.get(k) ?? "").trim();
    if (!get("name") || !get("phone")) {
      setError(copy.missing);
      return;
    }
    setError("");
    const lines = [
      `${copy.name}: ${get("name")}`,
      `${copy.phone}: ${get("phone")}`,
      `${copy.atelier}: ${get("atelier")}`,
      `${copy.city}: ${get("city")}`,
      `${copy.branches}: ${get("branches")}`,
      `${copy.type}: ${get("type")}`,
      `src=landing&lang=${locale}`,
    ];
    if (whatsappNumber) {
      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
      window.open(url, "_blank", "noopener");
    }
    setSent(true);
  }

  const field =
    "w-full rounded-xl border border-[var(--mk-line)] bg-white/70 px-4 py-3 text-base outline-none transition focus:border-[var(--mk-ink)] focus:bg-white";

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit} noValidate>
      <label className="grid gap-1.5 text-sm">
        {copy.name}
        <input className={field} name="name" autoComplete="name" required />
      </label>
      <label className="grid gap-1.5 text-sm">
        {copy.phone}
        <input
          className={field}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          required
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        {copy.atelier}
        <input className={field} name="atelier" />
      </label>
      <label className="grid gap-1.5 text-sm">
        {copy.city}
        <input className={field} name="city" />
      </label>
      <label className="grid gap-1.5 text-sm">
        {copy.branches}
        <input
          className={field}
          name="branches"
          type="number"
          min={1}
          defaultValue={1}
          inputMode="numeric"
        />
      </label>
      <label className="grid gap-1.5 text-sm">
        {copy.type}
        <select className={field} name="type" defaultValue={copy.types.bridal}>
          <option>{copy.types.bridal}</option>
          <option>{copy.types.soiree}</option>
          <option>{copy.types.both}</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <button
          className="mk-btn w-full sm:w-auto"
          disabled={!whatsappNumber}
          type="submit"
        >
          {copy.submit}
        </button>
        <p aria-live="polite" className="mk-muted mt-3 min-h-5 text-sm">
          {error || (sent ? copy.sentHint : "")}
        </p>
      </div>
    </form>
  );
}
