"use client";

import { FingerprintPattern, LockIcon, ShieldCheckIcon } from "lucide-react";
import { Lead } from "@/components/ui/typography";
import { useTranslation } from "@/features/core/i18n/react";

export function AuthPlaceholder() {
    const { t } = useTranslation();

    return (
        <div className="grid h-full w-full place-content-center gap-4 p-4">
            <div className="grid grid-cols-2 justify-items-center gap-4 text-primary *:size-16">
                <ShieldCheckIcon />
                <FingerprintPattern />
                <LockIcon className="col-span-2" />
            </div>
            <Lead className="text-center font-mono text-2xl text-foreground text-shadow-lg text-shadow-primary">
                {t("appName")}
            </Lead>
        </div>
    );
}
