import { eventType, Inngest } from "inngest";
import { z } from "zod";

export const inngest = new Inngest({ id: "gateling" });

export const leadSubmittedEvent = eventType("lead/submitted", {
  schema: z.object({ leadId: z.string() }),
});

export const subscriberCreatedEvent = eventType("subscriber/created", {
  schema: z.object({ subscriberId: z.string() }),
});

export const caseStudyPublishedEvent = eventType("case-study/published", {
  schema: z.object({ caseStudyId: z.string(), slug: z.string() }),
});

export const blogPostPublishedEvent = eventType("blog-post/published", {
  schema: z.object({ blogPostId: z.string(), slug: z.string() }),
});

export const userRegisteredEvent = eventType("user/registered", {
  schema: z.object({ userId: z.string(), role: z.string() }),
});

export const leadStatusChangedEvent = eventType("lead/status-changed", {
  schema: z.object({ leadId: z.string(), newStatus: z.string() }),
});
