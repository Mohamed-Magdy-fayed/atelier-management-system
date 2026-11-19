import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/drizzle";
import { resolveLeadTarget } from "@/features/sandbox/server/lead-target";
import { leadSubmissionSchema } from "@/features/sandbox/lib/lead";

/**
 * Receives the sandbox sign-up answers and forwards them to the Gateling lead
 * endpoint. It records nothing itself.
 *
 * Abuse guard is deliberately light: a honeypot, a body cap, and a small
 * in-memory per-IP limit (best effort: it resets per server instance). The
 * receiving endpoint is the authority for dedupe and real rate limiting.
 */

const MAX_BODY_BYTES = 8_000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 6;

const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  // Hash the address so the map never holds a raw IP.
  const key = createHash("sha256").update(ip).digest("hex");
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "too_large" },
      { status: 413 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const parsed = leadSubmissionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  if (isRateLimited(clientIp(request))) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  const target = await resolveLeadTarget(db);
  if (!target) {
    // Honest failure: the form then offers the WhatsApp fallback.
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  const lead = parsed.data;

  try {
    const response = await fetch(target.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${target.key}`,
      },
      body: JSON.stringify({
        // Field names are the gateling.com self-serve endpoint contract.
        ownerName: lead.business.ownerName,
        atelierName: lead.business.name,
        phone: lead.business.phone,
        city: lead.business.city,
        branches: lead.business.branches,
        dressVolume: lead.business.dresses,
        currentTool: lead.answers.workaround.join(", ") || undefined,
        biggestPain: lead.answers.lastIncident,
        priceReaction: lead.answers.priceReaction,
        contactPreference: lead.answers.contactChannel,
        socialLink: lead.social,
        demoStepsCompleted: [
          ...(lead.sandbox.branchAdded ? ["address"] : []),
          ...(lead.sandbox.dressAdded ? ["dress"] : []),
        ],
        locale: lead.locale,
        consent: true,
        website: "",
      }),
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, error: "upstream" },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
