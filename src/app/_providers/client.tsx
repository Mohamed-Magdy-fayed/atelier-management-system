"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { LinkButton } from "@/components/general/link-button";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/features/core/auth/core/permissions";
import { AuthManager } from "@/features/core/auth/nextjs/components/auth-manager";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { BranchManager } from "@/features/core/auth/nextjs/components/branch-manager";
import { UserAvatar } from "@/features/core/auth/nextjs/components/user-avatar";
import { SYSTEM_NAV_ITEMS } from "@/features/core/app-shell/lib/nav";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";

export function ClientGreeting() {
    const { session } = useAuth();
    const trpc = useTRPC();
    const greeting = useQuery(
        trpc.hello.queryOptions({ text: session?.user.name || "world" }),
    );
    if (!greeting.data) return <div>Loading...</div>;
    return <div>{greeting.data.greeting}</div>;
}

export function HomeUserActions() {
    const { t } = useTranslation();
    const auth = useAuth();

    if (!auth.isAuthenticated) {
        return (
            <LinkButton variant="outline" href="/sign-in">
                {t("authTranslations.signIn.submit")}
            </LinkButton>
        );
    }

    return (
        <>
            <SystemPagesLink />
            <AuthManager
                trigger={
                    <Button variant="ghost" size="icon-sm" className="hover:opacity-50">
                        <UserAvatar />
                    </Button>
                }
            />
            <BranchManager />
        </>
    );
}

function SystemPagesLink() {
    const { t } = useTranslation();
    const auth = useAuth();

    const target = useMemo(() => {
        if (!auth.isAuthenticated) return null;
        const user = auth.session.user;
        return (
            SYSTEM_NAV_ITEMS.find((item) =>
                hasPermission(user, "screens", "view", { screenKey: item.screenKey }),
            ) ?? null
        );
    }, [auth]);

    if (!target) return null;

    const { Icon } = target;
    const label = String(t(`systemPages.${target.translationKey}`));

    return (
        <LinkButton variant="outline" size="sm" href={target.href} aria-label={label}>
            <Icon className="size-3.5" aria-hidden />
            {label}
        </LinkButton>
    );
}
