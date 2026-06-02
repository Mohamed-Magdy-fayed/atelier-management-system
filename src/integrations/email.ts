import "server-only";

import { sendMail as sendAuthMail } from "@/features/core/auth/nextjs/emails/mailer";

type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

/**
 * Send an email. Used by Inngest background jobs.
 * Silently logs a warning when SMTP is not configured — never throws.
 */
export async function sendMail(options: SendMailInput): Promise<void> {
  try {
    await sendAuthMail({
      toEmail: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    console.warn("[email] Failed to send:", options.subject, error);
  }
}
