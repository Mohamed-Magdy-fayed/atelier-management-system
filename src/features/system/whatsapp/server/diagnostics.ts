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

export type WhatsAppDiagnostic = {
  mode: "off" | "platform" | "own" | "unconfigured";
  /** True when a message sent right now would go out. */
  ok: boolean;
  issues: WhatsAppIssueCode[];
  /** Wapilot's own status word, when it answered. */
  statusMessage: string | null;
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
    };
  }

  if (!isSendableSender(sender)) {
    return {
      mode: "unconfigured",
      ok: false,
      issues: [sender.reason],
      statusMessage: null,
    };
  }

  try {
    const status = await checkStatus({
      instanceId: sender.instanceId,
      token: sender.token,
      signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
    });

    // Wapilot reports a reachable-but-logged-out instance as a 200, so success
    // has to be read off the payload rather than the HTTP status.
    const connected =
      status.success !== false && status.status?.toLowerCase() === "connected";

    return {
      mode: sender.mode,
      ok: connected,
      issues: connected ? [] : ["instanceNotConnected"],
      statusMessage: status.status_message ?? status.status ?? null,
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
    };
  }
}
