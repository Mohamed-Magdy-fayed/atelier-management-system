import "server-only";

import nodemailer from "nodemailer";

import { env } from "@/env/server";

export type SendMailOptions = {
  toEmail: string;
  toName?: string | null;
  subject: string;
  text?: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
};

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const secure = env.SMTP_PORT === 465;
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure,
    auth: {
      user: env.SMTP_FROM_EMAIL,
      pass: env.SMTP_PASSWORD,
    },
  });

  return cachedTransporter;
}

export async function sendMail(options: SendMailOptions) {
  // A demo's addresses are synthetic or a prospect's; neither should get mail.
  // Skipped rather than thrown so the flow that triggered it still completes.
  if (env.DEMO_MODE === "1") {
    console.info("DEMO_MODE: skipped email %s", options.subject);
    return;
  }

  const transporter = getTransporter();
  const fromEmail = options.fromEmail ?? env.SMTP_FROM_EMAIL;
  const fromName = options.fromName ?? env.SMTP_FROM_NAME;
  const to = options.toName
    ? `${options.toName} <${options.toEmail}>`
    : options.toEmail;

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
