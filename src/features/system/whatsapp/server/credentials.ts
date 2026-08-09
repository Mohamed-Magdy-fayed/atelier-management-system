import "server-only";

import { inArray } from "drizzle-orm";

import type { db as database } from "@/drizzle";
import { SettingsTable } from "@/drizzle/schema";
import { decryptSecret } from "@/features/system/settings/server/secret-crypto";
import {
  DEFAULT_WHATSAPP_SENDING_MODE,
  SYSTEM_SETTING_CODE,
  WHATSAPP_SENDING_MODES,
  type WhatsAppSendingMode,
} from "@/features/system/settings/lib/system-settings-registry";
import { env } from "@/env/server";

import type { WhatsAppIssueCode } from "../lib/issue-codes";

export type { WhatsAppIssueCode };

/**
 * Who an outbound message would be sent as.
 *
 * `unconfigured` is deliberately distinct from `off`: the operator asked for
 * messages and will not get them, which is a fault to surface, whereas `off`
 * is working as instructed.
 */
export type WhatsAppSender =
  | { mode: "off" }
  | { mode: "platform"; instanceId: string; token: string }
  | { mode: "own"; instanceId: string; token: string }
  | { mode: "unconfigured"; reason: WhatsAppIssueCode };

type DbClient = Pick<typeof database, "select">;

function isSendingMode(value: string): value is WhatsAppSendingMode {
  return (WHATSAPP_SENDING_MODES as readonly string[]).includes(value);
}

/**
 * Reads the sending mode and, when it is `own`, the atelier's own credentials.
 *
 * There is deliberately no fallback from `own` to `platform`. If the atelier
 * asked to send from their own number and the credentials are incomplete,
 * sending from the shared Gateling number instead would put the wrong sender in
 * front of their customer — worse than sending nothing and reporting it.
 */
export async function resolveWhatsAppSender(
  db: DbClient,
): Promise<WhatsAppSender> {
  const rows = await db
    .select({ code: SettingsTable.code, value: SettingsTable.value })
    .from(SettingsTable)
    .where(
      inArray(SettingsTable.code, [
        SYSTEM_SETTING_CODE.WHATSAPP_SENDING_MODE,
        SYSTEM_SETTING_CODE.WHATSAPP_INSTANCE_ID,
        SYSTEM_SETTING_CODE.WHATSAPP_API_TOKEN,
      ]),
    );

  const byCode = new Map(rows.map((row) => [row.code, row.value]));

  const rawMode = byCode.get(SYSTEM_SETTING_CODE.WHATSAPP_SENDING_MODE)?.trim();
  const mode: WhatsAppSendingMode =
    rawMode && isSendingMode(rawMode) ? rawMode : DEFAULT_WHATSAPP_SENDING_MODE;

  if (mode === "off") {
    return { mode: "off" };
  }

  if (mode === "platform") {
    const instanceId = env.WAPILOT_INSTANCE_ID;
    const token = env.WAPILOT_API_TOKEN;

    if (!instanceId || !token) {
      return { mode: "unconfigured", reason: "platformNotConfigured" };
    }

    return { mode: "platform", instanceId, token };
  }

  const instanceId = byCode
    .get(SYSTEM_SETTING_CODE.WHATSAPP_INSTANCE_ID)
    ?.trim();

  if (!instanceId) {
    return { mode: "unconfigured", reason: "ownMissingInstanceId" };
  }

  const storedToken = byCode.get(SYSTEM_SETTING_CODE.WHATSAPP_API_TOKEN)?.trim();

  if (!storedToken) {
    return { mode: "unconfigured", reason: "ownMissingToken" };
  }

  let token: string;
  try {
    token = decryptSecret(storedToken);
  } catch {
    // A rotated or missing SETTINGS_ENCRYPTION_KEY lands here. Reported rather
    // than thrown so the settings page can explain the fix.
    return { mode: "unconfigured", reason: "ownTokenUndecryptable" };
  }

  if (!token) {
    return { mode: "unconfigured", reason: "ownMissingToken" };
  }

  return { mode: "own", instanceId, token };
}

/** True when the sender can actually put a message on the wire. */
export function isSendableSender(
  sender: WhatsAppSender,
): sender is Extract<WhatsAppSender, { mode: "platform" | "own" }> {
  return sender.mode === "platform" || sender.mode === "own";
}
