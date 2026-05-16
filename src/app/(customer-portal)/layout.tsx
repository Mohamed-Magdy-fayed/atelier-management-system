import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAuth } from "@/features/core/auth/nextjs/actions";
import { getPostAuthRedirect } from "@/features/core/auth/nextjs/lib/post-auth-redirect";
import { CustomerPortalShell } from "@/features/customer-portal/components/customer-portal-shell";

export default async function CustomerPortalLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const auth = await getAuth();
  if (!auth.isAuthenticated) redirect("/sign-in");
  if (auth.session.user.role !== "customer") {
    redirect(getPostAuthRedirect(auth.session.user));
  }

  return <CustomerPortalShell>{children}</CustomerPortalShell>;
}
