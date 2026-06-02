import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { LeadsTable } from "@/drizzle/schema";
import { sendMail } from "@/integrations/email";
import { inngest, leadSubmittedEvent } from "../client";

export const onLeadSubmitted = inngest.createFunction(
  { id: "on-lead-submitted", triggers: [leadSubmittedEvent] },
  async ({ event }) => {
    const lead = await db.query.LeadsTable.findFirst({
      where: eq(LeadsTable.id, event.data.leadId),
    });

    if (!lead) return { skipped: true };

    await sendMail({
      to: "info@gateling.com",
      subject: `New lead: ${lead.name} (${lead.company ?? "no company"})`,
      html: `
        <h2>New Contact Submission</h2>
        <p><strong>Name:</strong> ${lead.name}</p>
        <p><strong>Email:</strong> ${lead.email}</p>
        <p><strong>Company:</strong> ${lead.company ?? "—"}</p>
        <p><strong>Phone:</strong> ${lead.phone ?? "—"}</p>
        <p><strong>Message:</strong></p>
        <blockquote>${lead.message}</blockquote>
      `,
    });

    await sendMail({
      to: lead.email,
      subject: "We received your message — Gateling Solutions",
      html: `
        <h2>Thanks for reaching out, ${lead.name}!</h2>
        <p>We've received your message and will get back to you within 24 hours.</p>
        <p>— The Gateling Solutions Team</p>
      `,
    });

    return { notified: true };
  },
);
