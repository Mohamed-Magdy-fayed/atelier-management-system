import { AlertTriangleIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getT } from "@/features/core/i18n/server";

export default async function FormAlert({ message }: { message: string }) {
    const { t } = await getT();
    return (
        <Alert variant="destructive" className="w-full">
            <AlertTriangleIcon />
            <AlertTitle>{t("errorTitle")}</AlertTitle>
            <AlertDescription>{t("error", { error: message })}</AlertDescription>
        </Alert>
    );
}
