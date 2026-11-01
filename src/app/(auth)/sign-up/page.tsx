import { SignUpForm } from "@/features/core/auth/nextjs/components/sign-up-form";
import { isDemoMode } from "@/features/system/settings/server/branding";

export default async function SignUpPage() {
  return <SignUpForm isOAuthEnabled={!isDemoMode()} />;
}
