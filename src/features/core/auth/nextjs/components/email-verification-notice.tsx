"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";
import { H3, P } from "@/components/ui/typography";
import { beginEmailVerificationAction } from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { useTranslation } from "@/features/core/i18n/client";

export function EmailVerificationNotice({
    isVerified,
    onClose,
}: {
    isVerified?: boolean;
    onClose?: () => void;
}) {
    const { t } = useTranslation();
    const { session } = useAuth();
    const [isPending, startTransition] = useTransition();

    const email = session?.user.email;

    if (isVerified) {
        return (
            <Status variant="success">
                <StatusIndicator />
                <StatusLabel>
                    {t("authTranslations.emailVerification.alreadyVerifiedNote")}
                </StatusLabel>
            </Status>
        );
    }

    if (!email) {
        return (
            <Status variant="warning">
                <StatusIndicator />
                <StatusLabel>
                    {t("authTranslations.emailVerification.notice.missingEmail")}
                </StatusLabel>
            </Status>
        );
    }

    return (
        <div>
            <H3>{t("authTranslations.emailVerification.notice.title")}</H3>
            <P>{email}</P>
            <Status variant="error">
                <StatusIndicator />
                <StatusLabel>
                    {t("authTranslations.emailVerification.heading")}
                </StatusLabel>
            </Status>
            <div className="flex items-center gap-4 pt-4">
                <Button
                    disabled={isPending}
                    onClick={() => {
                        startTransition(async () => {
                            try {
                                const res = await beginEmailVerificationAction();
                                if (res.isError) {
                                    toast.error(
                                        res.message ??
                                        t("authTranslations.emailVerification.error.sendFailed"),
                                    );
                                    return;
                                }

                                toast.success(t("authTranslations.emailVerification.sent"));
                            } catch (error) {
                                toast.error(
                                    error instanceof Error
                                        ? error.message
                                        : t(
                                            "authTranslations.emailVerification.error.sendFailed",
                                        ),
                                );
                            }
                        });
                    }}
                    type="button"
                >
                    {isPending
                        ? t("authTranslations.emailVerification.notice.sending")
                        : t("authTranslations.emailVerification.notice.sendButton")}
                </Button>
                {onClose && (
                    <Button onClick={onClose} variant="destructive">
                        {t("common.cancel")}
                    </Button>
                )}
            </div>
        </div>
    );
}
