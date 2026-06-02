"use client";

import { startTransition, useState } from "react";
import { signOutAction } from "@/features/core/auth/nextjs/actions";
import { getPublicAccountDestination } from "@/features/public-catalog/lib/public-account-destination";
import { AuthManagerDialogs } from "@/features/core/auth/nextjs/components/auth-manager/auth-manager-dialogs";
import { AuthManagerDropdown } from "@/features/core/auth/nextjs/components/auth-manager/auth-manager-dropdown";
import { AuthManagerGuestMenu } from "@/features/core/auth/nextjs/components/auth-manager/auth-manager-guest-menu";
import type { AuthManagerDialog } from "@/features/core/auth/nextjs/components/auth-manager/types";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";

export function AuthManager({ trigger }: { trigger: React.ReactElement }) {
  const { isAuthenticated, session } = useAuth();

  const [openDialog, setOpenDialog] = useState<AuthManagerDialog | undefined>();

  if (!isAuthenticated) {
    return <AuthManagerGuestMenu trigger={trigger} />;
  }

  const hasEmail = !!session.user.email;
  const isEmailVerified = !!session.user.emailVerifiedAt;
  const accountPage = getPublicAccountDestination(session.user);

  return (
    <>
      <AuthManagerDialogs
        hasEmail={hasEmail}
        hasPassword={!!session.hasPassword}
        isEmailVerified={isEmailVerified}
        openDialog={openDialog}
        setOpenDialog={setOpenDialog}
        userEmail={session.user.email}
      />
      <AuthManagerDropdown
        trigger={trigger}
        hasEmail={hasEmail}
        hasPassword={!!session.hasPassword}
        isEmailVerified={isEmailVerified}
        accountPage={accountPage}
        onOpenDialog={setOpenDialog}
        onSignOut={() =>
          startTransition(async () => {
            await signOutAction();
          })
        }
      />
    </>
  );
}
