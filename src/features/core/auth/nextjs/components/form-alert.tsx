"use client";

import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslation } from "@/features/core/i18n/client";

export default function FormAlert({ message }: { message: string }) {
    const { t } = useTranslation();

    return (
        <Alert variant="destructive" className="w-full">
            <AlertTriangleIcon />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{t("error", { error: message })}</AlertDescription>
        </Alert>
    );
}
