"use client";

import { FingerprintPattern, LockIcon, ShieldCheckIcon } from "lucide-react";
import { Lead, Muted } from "@/components/ui/typography";
import { useTranslation } from "@/features/core/i18n/client";

export function AuthPlaceholder() {
    const { t } = useTranslation();

    return (
        <div className="grid h-full w-full place-content-center gap-4 p-6">
            <div className="grid grid-cols-2 justify-items-center gap-4 text-primary *:size-16">
                <ShieldCheckIcon />
                <FingerprintPattern />
                <LockIcon className="col-span-2" />
            </div>
            <Lead className="text-center font-mono text-2xl text-foreground text-shadow-lg text-shadow-primary">
                {t("appName")}
            </Lead>
            <Muted className="max-w-sm text-center leading-6">
                {t("landing.authPanelLead")}
            </Muted>
        </div>
    );
}
