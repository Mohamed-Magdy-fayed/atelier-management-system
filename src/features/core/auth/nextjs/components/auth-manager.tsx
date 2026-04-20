"use client";

import {
    ListTreeIcon,
    LockKeyhole,
    LogOut,
    MailIcon,
    ShieldBanIcon,
    UserIcon,
} from "lucide-react";
import { Activity, startTransition, useState } from "react";

import { ResponsiveDialog } from "@/components/general/responsive-dialog";
import { ButtonGroup } from "@/components/ui/button-group";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Status, StatusIndicator } from "@/components/ui/status";
import { signOutAction } from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { ChangeEmailForm } from "@/features/core/auth/nextjs/components/change-email-form";
import { ChangePasswordForm } from "@/features/core/auth/nextjs/components/change-password-form";
import { EmailVerificationNotice } from "@/features/core/auth/nextjs/components/email-verification-notice";
import { OAuthConnections } from "@/features/core/auth/nextjs/components/oauth-connections";
import { PasskeyManager } from "@/features/core/auth/nextjs/components/passkey-manager";
import { ProfileForm } from "@/features/core/auth/nextjs/components/profile-form";
import { ThemeToggle } from "@/features/core/color-theme/client";
import { LanguageToggle, useTranslation } from "@/features/core/i18n/client";
import { useIsMobile } from "@/hooks/use-mobile";

export function AuthManager({ trigger }: { trigger: React.ReactElement }) {
    const { t } = useTranslation();
    const { isAuthenticated, session } = useAuth();
    const isMobile = useIsMobile();

    const [openDialog, setOpenDialog] = useState<
        "profile" | "email" | "password" | "oauth" | "passkeys" | undefined
    >();

    if (!isAuthenticated) return <Skeleton className="h-12 w-full" />;

    const hasEmail = !!session.user.email;
    const isEmailVerified = !!session.user.emailVerifiedAt;

    return (
        <>
            <ResponsiveDialog
                onOpenChange={(open) => setOpenDialog(open ? "profile" : undefined)}
                open={openDialog === "profile"}
            >
                <ProfileForm callback={() => setOpenDialog(undefined)} />
            </ResponsiveDialog>
            <ResponsiveDialog
                onOpenChange={(open) => setOpenDialog(open ? "email" : undefined)}
                open={openDialog === "email"}
            >
                <div className="flex flex-col gap-4">
                    <EmailVerificationNotice
                        isVerified={!!session.user.emailVerifiedAt}
                        onClose={() => setOpenDialog(undefined)}
                    />
                    <Activity mode={isEmailVerified || !hasEmail ? "visible" : "hidden"}>
                        <ChangeEmailForm />
                    </Activity>
                </div>
            </ResponsiveDialog>
            <ResponsiveDialog
                onOpenChange={(open) => setOpenDialog(open ? "password" : undefined)}
                open={openDialog === "password"}
            >
                <ChangePasswordForm
                    callback={() => setOpenDialog(undefined)}
                    isCreate={!session?.hasPassword}
                />
            </ResponsiveDialog>
            <ResponsiveDialog
                onOpenChange={(open) => setOpenDialog(open ? "oauth" : undefined)}
                open={openDialog === "oauth"}
            >
                <OAuthConnections />
            </ResponsiveDialog>
            <ResponsiveDialog
                onOpenChange={(open) => setOpenDialog(open ? "passkeys" : undefined)}
                open={openDialog === "passkeys"}
            >
                <PasskeyManager />
            </ResponsiveDialog>
            <DropdownMenu>
                <DropdownMenuTrigger render={trigger} />
                <DropdownMenuContent
                    align="end"
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    sideOffset={4}
                >
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={() => setOpenDialog("profile")}>
                            <UserIcon />
                            {t("authTranslations.profile.title")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOpenDialog("email")}>
                            <MailIcon />
                            {!hasEmail
                                ? t("authTranslations.profile.email.add")
                                : !isEmailVerified
                                    ? t("authTranslations.emailVerification.verifyEmail")
                                    : t("authTranslations.profile.email.change")}
                            {hasEmail && !isEmailVerified && (
                                <Status className="ms-auto" variant="warning">
                                    <StatusIndicator />
                                </Status>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOpenDialog("password")}>
                            <ShieldBanIcon />
                            {t("authTranslations.profile.password.createOrChange", {
                                isChange: session?.hasPassword ? "true" : "false",
                            })}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOpenDialog("oauth")}>
                            <ListTreeIcon />
                            {t("authTranslations.oauth.manage")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setOpenDialog("passkeys")}>
                            <LockKeyhole />
                            {t("authTranslations.passkeys.manage")}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <ButtonGroup className="*:flex-1 w-full">
                            <ThemeToggle />
                            <LanguageToggle />
                        </ButtonGroup>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() =>
                            startTransition(async () => {
                                await signOutAction();
                            })
                        }
                        variant="destructive"
                    >
                        <LogOut />
                        {t("authTranslations.signOut")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
