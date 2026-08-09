import { eventType } from "inngest";
import z from "zod";

import { db } from "@/drizzle";
import { mainTranslations } from "@/features/core/i18n/global";
import { createI18n } from "@/features/core/i18n/lib";
import { getBusinessTimezone } from "@/features/public-catalog/server/queries";
import {
  isSendableSender,
  resolveWhatsAppSender,
} from "@/features/system/whatsapp/server/credentials";
import { buildReservationMessage } from "@/features/system/whatsapp/lib/reservation-message";
import { sendText } from "@/integrations/whatsapp";
import { toWhatsAppChatId } from "@/lib/phone";

import { inngest } from "../client";

export const reservationCreated = eventType("app/reservation.created", {
  schema: z.object({
    reservationId: z.string(),
    customerName: z.string(),
    customerPhone: z.string().nullable(),
    branchName: z.string(),
    reservationCode: z.string(),
    dressTitle: z.string(),
    dressCode: z.string().nullable(),
    receivingDateTime: z.string(),
    occasionDate: z.string().nullable(),
    returnDateTime: z.string(),
    totalPrice: z.number(),
    discount: z.number(),
    insurance: z.number(),
    depositPaid: z.number(),
    /**
     * Snapshot of the locale the reservation was taken in. `getT()` reads
     * request cookies and there are none here; customers also have no locale of
     * their own, so the staff member's language at the till is the best signal
     * available. Mirrors how `import_jobs.locale` is captured.
     */
    locale: z.string(),
  }),
});

/**
 * Sends the customer their reservation confirmation.
 *
 * Every "we are not sending this" path returns a named skip rather than
 * throwing, so Inngest only retries genuine send failures — a reservation for a
 * customer with no phone is not an error to be retried five times.
 */
export const sendReservationWhatsApp = inngest.createFunction(
  {
    id: "send-reservation-whatsapp",
    triggers: [reservationCreated],
    retries: 3,
  },
  async ({ event, step }) => {
    const { data } = event;

    const chatId = toWhatsAppChatId(data.customerPhone);
    if (!chatId) {
      return { skipped: "no-phone" as const };
    }

    const sender = await step.run("resolve-sender", async () =>
      resolveWhatsAppSender(db),
    );

    if (sender.mode === "off") {
      return { skipped: "messaging-off" as const };
    }

    if (!isSendableSender(sender)) {
      // Reported, not thrown: retrying cannot fix a missing credential, and the
      // settings page already shows the operator what is wrong.
      return { skipped: "unconfigured" as const, reason: sender.reason };
    }

    const timeZone = await step.run("resolve-timezone", async () =>
      getBusinessTimezone(),
    );

    const { t } = createI18n(mainTranslations, data.locale, "ar");

    const text = buildReservationMessage({
      t,
      locale: data.locale,
      timeZone,
      mode: sender.mode,
      data: {
        customerName: data.customerName,
        branchName: data.branchName,
        reservationCode: data.reservationCode,
        dressTitle: data.dressTitle,
        dressCode: data.dressCode,
        receivingDateTime: new Date(data.receivingDateTime),
        occasionDate: data.occasionDate ? new Date(data.occasionDate) : null,
        returnDateTime: new Date(data.returnDateTime),
        totalPrice: data.totalPrice,
        discount: data.discount,
        insurance: data.insurance,
        depositPaid: data.depositPaid,
      },
    });

    const result = await step.run("send-text", async () =>
      sendText({
        instanceId: sender.instanceId,
        token: sender.token,
        params: { chat_id: chatId, text },
      }),
    );

    return {
      sent: true as const,
      mode: sender.mode,
      reservationId: data.reservationId,
      messageId: result.message_id ?? null,
    };
  },
);
