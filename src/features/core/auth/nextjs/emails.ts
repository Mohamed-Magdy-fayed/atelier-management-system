import nodemailer from "nodemailer";
import { env } from "@/env/server";

type SendResult = { sent: boolean; message?: string };

let transporter: nodemailer.Transporter | null | undefined;

function getTransporter(): nodemailer.Transporter | null {
    if (transporter !== undefined) {
        return transporter;
    }

    if (
        !env.SMTP_HOST ||
        !env.SMTP_PORT ||
        !env.SMTP_USER ||
        !env.SMTP_PASSWORD ||
        !env.SMTP_FROM_EMAIL
    ) {
        transporter = null;
        return transporter;
    }

    transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE === "true" || env.SMTP_PORT === 465,
        auth: {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
        },
    });

    return transporter;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function getFromHeader(): string {
    if (env.SMTP_FROM_NAME) {
        return `${env.SMTP_FROM_NAME} <${env.SMTP_FROM_EMAIL}>`;
    }
    return env.SMTP_FROM_EMAIL ?? "no-reply@example.com";
}

function renderEmailLayout(args: {
    preheader: string;
    title: string;
    intro: string;
    ctaLabel: string;
    ctaUrl: string;
    footerNote: string;
}): { html: string; text: string } {
    const safe = {
        preheader: escapeHtml(args.preheader),
        title: escapeHtml(args.title),
        intro: escapeHtml(args.intro),
        ctaLabel: escapeHtml(args.ctaLabel),
        ctaUrl: escapeHtml(args.ctaUrl),
        footerNote: escapeHtml(args.footerNote),
    };

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safe.title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f8;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${safe.preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;background:#f4f6f8;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#0f766e,#0891b2);color:#ffffff;">
                <h1 style="margin:0;font-size:20px;line-height:1.4;font-weight:700;">${safe.title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;color:#111827;">${safe.intro}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px 0;">
                  <tr>
                    <td style="border-radius:10px;background:#0f766e;">
                      <a href="${safe.ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${safe.ctaLabel}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 10px 0;font-size:13px;line-height:1.6;color:#4b5563;">If the button does not work, copy and paste this URL into your browser:</p>
                <p style="margin:0 0 18px 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe.ctaUrl}" target="_blank" rel="noopener noreferrer" style="color:#0f766e;">${safe.ctaUrl}</a></p>
                <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" />
                <p style="margin:0;font-size:12px;line-height:1.7;color:#6b7280;">${safe.footerNote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const text = [
        args.title,
        "",
        args.intro,
        "",
        `${args.ctaLabel}: ${args.ctaUrl}`,
        "",
        args.footerNote,
    ].join("\n");

    return { html, text };
}

async function sendEmail(args: {
    to: string;
    subject: string;
    html: string;
    text: string;
}): Promise<SendResult> {
    const smtp = getTransporter();
    if (!smtp) {
        return {
            sent: false,
            message: "SMTP is not configured.",
        };
    }

    try {
        await smtp.sendMail({
            from: getFromHeader(),
            to: args.to,
            subject: args.subject,
            html: args.html,
            text: args.text,
        });
        return { sent: true };
    } catch (error) {
        console.error("Failed to send email", error);
        return {
            sent: false,
            message: "Failed to send email via SMTP.",
        };
    }
}

export async function sendEmailVerificationEmail(args: {
    email: string;
    verificationUrl?: string;
}): Promise<SendResult> {
    if (!args.verificationUrl) {
        return {
            sent: false,
            message: "Verification URL is missing.",
        };
    }

    const content = renderEmailLayout({
        preheader: "Confirm your email address.",
        title: "Verify your email",
        intro:
            "Thanks for signing up. Confirm your email address to secure your account and complete setup.",
        ctaLabel: "Verify email",
        ctaUrl: args.verificationUrl,
        footerNote:
            "If you did not request this, you can safely ignore this email.",
    });

    return sendEmail({
        to: args.email,
        subject: "Verify your email address",
        ...content,
    });
}

export async function sendEmailChangeVerification(args: {
    email: string;
    verificationUrl?: string;
}): Promise<SendResult> {
    if (!args.verificationUrl) {
        return {
            sent: false,
            message: "Verification URL is missing.",
        };
    }

    const content = renderEmailLayout({
        preheader: "Confirm your new email address.",
        title: "Confirm your email change",
        intro:
            "A request was made to use this address on your account. Confirm this change to finish updating your email.",
        ctaLabel: "Confirm email change",
        ctaUrl: args.verificationUrl,
        footerNote:
            "If you did not request this change, do not click the link and contact support.",
    });

    return sendEmail({
        to: args.email,
        subject: "Confirm your email change",
        ...content,
    });
}
