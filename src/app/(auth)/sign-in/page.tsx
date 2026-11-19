import { SignInForm } from "@/features/core/auth/nextjs/components/sign-in-form";
import { isDemoMode } from "@/features/system/settings/server/branding";

export default async function SignInPage() {
  return <SignInForm isOAuthEnabled={!isDemoMode()} />;
}
