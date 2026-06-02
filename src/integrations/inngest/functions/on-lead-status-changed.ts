import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { LeadsTable } from "@/drizzle/schema";
import { sendMail } from "@/integrations/email";
import { inngest, leadStatusChangedEvent } from "../client";

export const onLeadStatusChanged = inngest.createFunction(
  { id: "on-lead-status-changed", triggers: [leadStatusChangedEvent] },
  async ({ event }) => {
    if (event.data.newStatus !== "qualified") return { skipped: true };

    const lead = await db.query.LeadsTable.findFirst({
      where: eq(LeadsTable.id, event.data.leadId),
    });

    if (!lead) return { skipped: true };

    await sendMail({
      to: "info@gateling.com",
      subject: `🎯 Qualified lead: ${lead.name} (${lead.company ?? "no company"})`,
      html: `<h2>Lead Qualified</h2>
        <p><strong>${lead.name}</strong> from <strong>${lead.company ?? "—"}</strong> marked as qualified.</p>
        <p>Email: ${lead.email} | Phone: ${lead.phone ?? "—"}</p>`,
    });

    return { notified: true };
  },
);
