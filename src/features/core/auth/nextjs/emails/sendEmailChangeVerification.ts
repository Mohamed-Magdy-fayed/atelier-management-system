import "server-only";

import { render } from "@react-email/components";
import * as React from "react";

import type { SendEmailChangeVerificationEmail } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/server";
import { sendMail } from "./mailer";
import { BaseEmail } from "./templates/BaseEmail";

export const sendEmailChangeVerification: SendEmailChangeVerificationEmail =
  async (options) => {
    const { t } = await getT();
    const defaultRecipientName = t(
      "authTranslations.emails.common.defaultRecipientName",
    );
    const displayName = options.name?.trim() || defaultRecipientName;

    const subject = t(
      "authTranslations.emails.emailChangeVerification.subject",
    );
    const text = t("authTranslations.emails.emailChangeVerification.text", {
      name: displayName,
      currentEmail: options.currentEmail,
      newEmail: options.to,
      verificationUrl: options.verificationUrl,
    });

    const greeting = t("authTranslations.emails.common.greetingHtml", {
      name: displayName,
    }).replace(/<[^>]+>/g, "");
    const intro = t(
      "authTranslations.emails.emailChangeVerification.html.intro",
      {
        currentEmail: options.currentEmail,
        newEmail: options.to,
      },
    );
    const ctaLabel = t(
      "authTranslations.emails.emailChangeVerification.ctaLabel",
    );
    const notice = t(
      "authTranslations.emails.emailChangeVerification.html.ignore",
    );
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
        ctaLabel,
        ctaUrl: options.verificationUrl,
        notice,
        signature,
      }),
    );

    await sendMail({
      toEmail: options.to,
      toName: displayName,
      subject,
      text,
      html,
      fromName: t("authTranslations.emails.common.fromName"),
    });
  };
