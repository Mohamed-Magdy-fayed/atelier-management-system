"use client";

import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2Icon,
  Loader2Icon,
  MessageCircleOffIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "@/features/core/i18n/client";
import type { WhatsAppIssueCode } from "@/features/system/whatsapp/lib/issue-codes";
import { useTRPC } from "@/integrations/trpc/client";

/**
 * One line per issue code, each naming both the problem and the fix.
 *
 * The server returns codes rather than prose so it stays locale-free; the
 * mapping lives here so an operator reading Arabic gets the same guidance.
 * Typed as a total record, so a new issue code fails the build until it has
 * something to say to the person who has to fix it.
 */
const ISSUE_MESSAGE_KEYS = {
  messagingOff: "systemPages.whatsappIssueMessagingOff",
  ownMissingInstanceId: "systemPages.whatsappIssueOwnMissingInstanceId",
  ownMissingToken: "systemPages.whatsappIssueOwnMissingToken",
  ownTokenUndecryptable: "systemPages.whatsappIssueOwnTokenUndecryptable",
  platformNotConfigured: "systemPages.whatsappIssuePlatformNotConfigured",
  instanceNotConnected: "systemPages.whatsappIssueInstanceNotConnected",
  authRejected: "systemPages.whatsappIssueAuthRejected",
  unreachable: "systemPages.whatsappIssueUnreachable",
} as const satisfies Record<WhatsAppIssueCode, string>;

/**
 * Live state of the WhatsApp integration, above the settings grid.
 *
 * Refetched whenever a settings mutation invalidates the settings query key, so
 * changing the mode or pasting a credential re-verifies against Wapilot without
 * the operator having to guess whether it took.
 */
export function WhatsAppStatusAlert() {
  const { t } = useTranslation();
  const trpc = useTRPC();

  const { data, isPending, isError } = useQuery({
    ...trpc.settings.whatsappStatus.queryOptions(),
    // The check calls a third party; don't hammer it on every window focus.
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    retry: false,
  });

  if (isPending) {
    return (
      <Alert>
        <Loader2Icon className="size-4 animate-spin" />
        <AlertTitle>{String(t("systemPages.whatsappStatusTitle"))}</AlertTitle>
        <AlertDescription>
          {String(t("systemPages.whatsappStatusChecking"))}
        </AlertDescription>
      </Alert>
    );
  }

  if (isError || !data) {
    return (
      <Alert className="border-destructive text-destructive">
        <TriangleAlertIcon className="size-4" />
        <AlertTitle>{String(t("systemPages.whatsappStatusTitle"))}</AlertTitle>
        <AlertDescription>
          {String(t("systemPages.whatsappIssueUnreachable"))}
        </AlertDescription>
      </Alert>
    );
  }

  // "Off" is working as instructed, not a fault — muted, never alarming.
  if (data.mode === "off") {
    return (
      <Alert className="bg-muted text-muted-foreground">
        <MessageCircleOffIcon className="size-4" />
        <AlertTitle>{String(t("systemPages.whatsappStatusTitle"))}</AlertTitle>
        <AlertDescription>
          {String(t("systemPages.whatsappIssueMessagingOff"))}
        </AlertDescription>
      </Alert>
    );
  }

  if (data.ok) {
    return (
      <Alert className="border-primary text-primary">
        <CheckCircle2Icon className="size-4" />
        <AlertTitle>{String(t("systemPages.whatsappStatusTitle"))}</AlertTitle>
        <AlertDescription>
          {String(
            t(
              data.mode === "own"
                ? "systemPages.whatsappStatusHealthyOwn"
                : "systemPages.whatsappStatusHealthyPlatform",
            ),
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-destructive text-destructive">
      <TriangleAlertIcon className="size-4" />
      <AlertTitle>{String(t("systemPages.whatsappStatusTitle"))}</AlertTitle>
      <AlertDescription>
        <ul className="space-y-1">
          {data.issues.map((issue) => (
            <li key={issue}>
              {issue in ISSUE_MESSAGE_KEYS
                ? String(t(ISSUE_MESSAGE_KEYS[issue as WhatsAppIssueCode]))
                : issue}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
