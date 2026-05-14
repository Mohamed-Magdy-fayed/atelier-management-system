import { ResetPasswordForm } from "@/features/core/auth/nextjs/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return <ResetPasswordForm initialEmail={email} />;
}
