import "server-only";

import type { db as database } from "@/drizzle";
import { checkStatus, WapilotHttpError } from "@/integrations/whatsapp";

import {
  isSendableSender,
  resolveWhatsAppSender,
  type WhatsAppIssueCode,
} from "./credentials";

/** Wapilot is a third party on a user-facing request, so it gets a short leash. */
const STATUS_TIMEOUT_MS = 8000;

/**
 * Wapilot's session states, which follow WAHA's vocabulary:
 * STOPPED, STARTING, SCAN_QR_CODE, WORKING, FAILED.
 *
 * A healthy instance reports WORKING — not "connected", which is the word the
 * dashboard shows the operator. The other spellings are kept as a hedge in case
 * a future version reports the friendlier term.
 */
const WORKING_STATES = new Set(["WORKING", "CONNECTED", "AUTHENTICATED", "OPEN"]);

/**
 * Maps a Wapilot session state to the issue to report, or null when healthy.
 *
 * Exported so the state vocabulary is covered by `smoke:whatsapp` — the
 * original version of this compared against "connected", which is the word the
 * Wapilot dashboard shows a human but never the word the API returns, so a live
 * instance was reported as disconnected in production.
 */
export function classifyWapilotStatus(
  rawStatus: string | null | undefined,
): WhatsAppIssueCode | null {
  const state = rawStatus?.toUpperCase() ?? "";
  if (WORKING_STATES.has(state)) return null;
  // Still booting: telling the operator to re-scan a QR code would be wrong.
  if (state === "STARTING") return "instanceStarting";
  return "instanceNotConnected";
}

export type WhatsAppDiagnostic = {
  mode: "off" | "platform" | "own" | "unconfigured";
  /** True when a message sent right now would go out. */
  ok: boolean;
  issues: WhatsAppIssueCode[];
  /** Wapilot's human-readable line, e.g. "Everything is fine." */
  statusMessage: string | null;
  /** Wapilot's raw session state, e.g. "WORKING" / "SCAN_QR_CODE". */
  status: string | null;
};

/**
 * Answers "would a message sent right now arrive, and if not, why".
 *
 * Issues are returned as stable codes rather than prose so this stays free of
 * locale concerns — the settings page maps each code to a translated line plus
 * the corrective step.
 */
export async function diagnoseWhatsAppSender(
  db: Parameters<typeof resolveWhatsAppSender>[0] & Pick<typeof database, "select">,
): Promise<WhatsAppDiagnostic> {
  const sender = await resolveWhatsAppSender(db);

  if (sender.mode === "off") {
    return {
      mode: "off",
      ok: true,
      issues: ["messagingOff"],
      statusMessage: null,
      status: null,
    };
  }

  if (!isSendableSender(sender)) {
    return {
      mode: "unconfigured",
      ok: false,
      issues: [sender.reason],
      statusMessage: null,
      status: null,
    };
  }

  try {
    const status = await checkStatus({
      instanceId: sender.instanceId,
      token: sender.token,
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });

    // Wapilot reports a reachable-but-logged-out instance as a 200, so the
    // verdict has to be read off the payload rather than the HTTP status.
    const issue = classifyWapilotStatus(status.status);
    const ok = status.success !== false && issue === null;

    return {
      mode: sender.mode,
      ok,
      issues: ok ? [] : [issue ?? "instanceNotConnected"],
      // Carried through to the banner so the next unrecognised state names
      // itself instead of being reported as a generic disconnection.
      statusMessage: status.status_message ?? status.status ?? null,
      status: status.status ?? null,
    };
  } catch (error) {
    const issue: WhatsAppIssueCode =
      error instanceof WapilotHttpError &&
      (error.status === 401 || error.status === 403)
        ? "authRejected"
        : "unreachable";

    return {
      mode: sender.mode,
      ok: false,
      issues: [issue],
      statusMessage: error instanceof Error ? error.message : null,
      status: null,
    };
  }
}
