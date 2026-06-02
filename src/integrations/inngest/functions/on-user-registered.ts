import { eq } from "drizzle-orm";

import { db } from "@/drizzle";
import { UsersTable } from "@/drizzle/schema";
import { sendMail } from "@/integrations/email";
import { inngest, userRegisteredEvent } from "../client";

export const onUserRegistered = inngest.createFunction(
  { id: "on-user-registered", triggers: [userRegisteredEvent] },
  async ({ event }) => {
    const user = await db.query.UsersTable.findFirst({
      where: eq(UsersTable.id, event.data.userId),
      columns: { name: true, email: true, role: true },
    });

    if (!user?.email) return { skipped: true };

    const isCustomer = user.role === "customer";
    await sendMail({
      to: user.email,
      subject: isCustomer
        ? "Welcome to Gateling Solutions"
        : "Your Gateling Solutions workspace account",
      html: isCustomer
        ? `<h2>Welcome${user.name ? `, ${user.name}` : ""}!</h2>
           <p>Thanks for creating an account. You can track your inquiries in your <a href="https://gateling.com/my-account">account portal</a>.</p>
           <p>— The Gateling Solutions Team</p>`
        : `<h2>Account created</h2>
           <p>Hi${user.name ? ` ${user.name}` : ""},</p>
           <p>Your workspace account is ready. <a href="https://gateling.com/sign-in">Sign in here</a>.</p>
           <p>— The Gateling Solutions Team</p>`,
    });

    return { welcomed: true };
  },
);
