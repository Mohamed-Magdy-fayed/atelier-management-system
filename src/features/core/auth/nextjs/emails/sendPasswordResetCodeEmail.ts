import "server-only";

import { render } from "@react-email/components";
import * as React from "react";

import { getT } from "@/features/core/i18n/server";

import { sendMail } from "./mailer";
import { BaseEmail } from "./templates/BaseEmail";

export async function sendPasswordResetCodeEmail(options: {
  to: string;
  code: string;
  name?: string | null;
  expiresInMinutes: number;
}) {
  const { t } = await getT();
  const subject = t("authTranslations.emails.passwordReset.subject");
  const defaultRecipientName = t(
    "authTranslations.emails.common.defaultRecipientName",
  );
  const greetingName = options.name?.trim() || defaultRecipientName;
  const expiresIn = Math.max(options.expiresInMinutes, 1);
  const expiresInValue = String(expiresIn);
  const minutesLabel =
    expiresIn === 1
      ? t("authTranslations.emails.common.minuteSingular")
      : t("authTranslations.emails.common.minutePlural");

  const text = t("authTranslations.emails.passwordReset.text", {
    name: greetingName,
    expiresIn: expiresInValue,
    minutesLabel,
    code: options.code,
  });

  const greeting = t("authTranslations.emails.common.greetingHtml", {
    name: greetingName,
  }).replace(/<[^>]+>/g, "");
  const intro = t("authTranslations.emails.passwordReset.html.intro", {
    expiresIn: expiresInValue,
    minutesLabel,
  });
  const notice = t("authTranslations.emails.passwordReset.html.ignore");
  const signature = t("authTranslations.emails.common.signatureHtml").replace(
    /<br\s*\/?\s*>/gi,
    "\n",
  );

  const html = await render(
    React.createElement(BaseEmail, {
      preview: subject,
      subject,
      greeting,
      intro,
      codeBlock: options.code,
      notice,
      signature,
    }),
  );

  await sendMail({
    toEmail: options.to,
    toName: greetingName,
    subject,
    text,
    html,
    fromName: t("authTranslations.emails.common.fromName"),
  });
}
