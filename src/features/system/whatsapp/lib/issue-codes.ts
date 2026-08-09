/**
 * Why WhatsApp messages would not arrive.
 *
 * Lives outside `server/` because both sides need it: the diagnostics return
 * these codes instead of prose so they stay locale-free, and the settings page
 * maps each one to a translated problem-and-fix line.
 */
export const WHATSAPP_ISSUE_CODES = [
  /** Working as instructed, not a fault. */
  "messagingOff",
  "ownMissingInstanceId",
  "ownMissingToken",
  "ownTokenUndecryptable",
  "platformNotConfigured",
  "instanceNotConnected",
  "authRejected",
  "unreachable",
] as const;

export type WhatsAppIssueCode = (typeof WHATSAPP_ISSUE_CODES)[number];
