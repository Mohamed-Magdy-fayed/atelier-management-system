import "server-only";

import { render } from "@react-email/components";
import * as React from "react";

import type { SendEmailVerificationEmail } from "@/features/core/auth/types";
import { getT } from "@/features/core/i18n/server";

import { sendMail } from "./mailer";
import { BaseEmail } from "./templates/BaseEmail";

export const sendEmailVerificationEmail: SendEmailVerificationEmail = async (options) => {
    const { t } = await getT();
    const expiryHours = "24";
    const defaultRecipientName = t("authTranslations.emails.common.defaultRecipientName");
    const displayName = options.name?.trim() || defaultRecipientName;

    const subject = t("authTranslations.emails.emailVerification.subject");
    const text = t("authTranslations.emails.emailVerification.text", {
        name: displayName,
        expiryHours,
        verificationUrl: options.verificationUrl,
    });

    const greeting = t("authTranslations.emails.common.greetingHtml", { name: displayName }).replace(/<[^>]+>/g, "");
    const intro = t("authTranslations.emails.emailVerification.html.intro", { expiryHours });
    const ctaLabel = t("authTranslations.emails.emailVerification.ctaLabel");
    const notice = t("authTranslations.emails.emailVerification.html.ignore");
    const signature = t("authTranslations.emails.common.signatureHtml").replace(/<br\s*\/?\s*>/gi, "\n");

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