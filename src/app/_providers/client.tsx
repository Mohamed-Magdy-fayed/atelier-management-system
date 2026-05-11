"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { LinkButton } from "@/components/general/link-button";
import { Button } from "@/components/ui/button";
import { AuthManager } from "@/features/core/auth/nextjs/components/auth-manager";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { BranchManager } from "@/features/core/auth/nextjs/components/branch-manager";
import { UserAvatar } from "@/features/core/auth/nextjs/components/user-avatar";
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
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return (
            <LinkButton variant="outline" href="/sign-in">
                {t("authTranslations.signIn.submit")}
            </LinkButton>
        );
    }

    return (
        <>
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
