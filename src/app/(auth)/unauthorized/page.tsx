import { HomeIcon, ShieldBanIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getT } from "@/features/core/i18n/server";

export default async function UnauthorizedPage() {
    const { t } = await getT();

    return (
        <div className="grid justify-center gap-4 p-4">
            <Badge className="mx-auto" variant="destructive">
                {t("authTranslations.accessDenied")}
            </Badge>
            <ShieldBanIcon className="m-4" size={200} />
            <Button
                render={
                    <Link href="/">
                        <HomeIcon />
                        {t("authTranslations.backToHome")}
                    </Link>
                }
            />
        </div>
    );
}
