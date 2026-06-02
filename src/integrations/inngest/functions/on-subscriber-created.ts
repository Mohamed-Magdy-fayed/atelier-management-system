import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { SubscribersTable } from "@/drizzle/schema";
import { sendMail } from "@/integrations/email";
import { inngest, subscriberCreatedEvent } from "../client";

export const onSubscriberCreated = inngest.createFunction(
  { id: "on-subscriber-created", triggers: [subscriberCreatedEvent] },
  async ({ event }) => {
    const subscriber = await db.query.SubscribersTable.findFirst({
      where: eq(SubscribersTable.id, event.data.subscriberId),
    });

    if (!subscriber) return { skipped: true };

    await sendMail({
      to: subscriber.email,
      subject: "You're subscribed — Gateling Solutions",
      html: `
        <h2>Welcome to Gateling Insights!</h2>
        <p>You've successfully subscribed to our newsletter.</p>
        <p>To unsubscribe: <a href="https://gateling.com/unsubscribe?email=${encodeURIComponent(subscriber.email)}">click here</a>.</p>
        <p>— The Gateling Solutions Team</p>
      `,
    });

    return { welcomed: true };
  },
);
