import { ResetPasswordForm } from "@/features/core/auth/nextjs/components/reset-password-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
    const { phone } = await searchParams;

    return <ResetPasswordForm initialPhone={phone} />
}