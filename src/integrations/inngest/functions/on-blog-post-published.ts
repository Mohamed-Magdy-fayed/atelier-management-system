import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { SubscribersTable } from "@/drizzle/schema";
import { sendMail } from "@/integrations/email";
import { blogPostPublishedEvent, inngest } from "../client";

export const onBlogPostPublished = inngest.createFunction(
  { id: "on-blog-post-published", triggers: [blogPostPublishedEvent] },
  async ({ event }) => {
    const url = `https://gateling.com/blog/${event.data.slug}`;
    try {
      await fetch(
        `https://api.indexnow.org/indexnow?url=${encodeURIComponent(url)}&key=gateling`,
      );
    } catch {
      // Non-fatal
    }

    const subscribers = await db.query.SubscribersTable.findMany({
      where: eq(SubscribersTable.status, "active"),
      columns: { email: true },
    });

    for (const sub of subscribers) {
      await sendMail({
        to: sub.email,
        subject: "New post from Gateling Solutions",
        html: `<p>We published a new article. <a href="${url}">Read it here</a>.</p>
          <p style="font-size:12px"><a href="https://gateling.com/unsubscribe?email=${encodeURIComponent(sub.email)}">Unsubscribe</a></p>`,
      });
    }

    return { pinged: url, notified: subscribers.length };
  },
);
