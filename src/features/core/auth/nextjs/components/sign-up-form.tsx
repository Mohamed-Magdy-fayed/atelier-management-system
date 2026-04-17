"use client";

import { ArrowLeftIcon, RefreshCwIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import {
	FieldDescription,
	FieldSeparator,
	FieldSet,
} from "@/components/ui/field";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { H1, Muted } from "@/components/ui/typography";
import {
	oAuthSignIn,
	sendSignUpOtpAction,
	signUpAction,
	verifySignUpOtpAction,
} from "@/features/core/auth/nextjs/actions";
import { useOauthProviderIcon } from "@/features/core/auth/nextjs/components/useOauthProviderIcon";
import {
	customerDetailsStepSchema,
	customerOtpStepSchema,
	customerPhoneStepSchema,
} from "@/features/core/auth/schemas";
import {
	type OAuthProvider,
	oAuthProviderValues,
} from "@/features/core/auth/tables/user-oauth-accounts-table";
import { useTranslation } from "@/features/core/i18n/react";

function deriveStep(
	searchParams: URLSearchParams,
): "phone" | "otp" | "details" {
	if (searchParams.get("vid")) return "details";
	if (searchParams.get("phone")) return "otp";
	return "phone";
}

export function SignUpForm() {
	const { t } = useTranslation();
	const router = useRouter();
	const searchParams = useSearchParams();
	const getOauthProviderIcon = useOauthProviderIcon();
	const [isPending, startTransition] = useTransition();

	const step = deriveStep(searchParams);
	const phone = searchParams.get("phone") ?? "";
	const verificationId = searchParams.get("vid") ?? "";

	// Step 1: Phone form
	const phoneForm = useAppForm({
		defaultValues: { phone: "" },
		validators: { onSubmit: customerPhoneStepSchema },
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				try {
					const result = await sendSignUpOtpAction({ phone: value.phone });
					if (result.isError) {
						toast.error(
							result.message ?? t("authTranslations.signUp.error.generic"),
						);
						return;
					}
					const params = new URLSearchParams(searchParams);
					params.set("phone", value.phone);
					router.push(`/sign-up?${params.toString()}`);
				} catch (error) {
					toast.error(
						error instanceof Error
							? error.message
							: t("authTranslations.signUp.error.generic"),
					);
				}
			});
		},
	});

	// Step 2: OTP form
	const otpForm = useAppForm({
		defaultValues: { phone, otp: "" },
		validators: { onSubmit: customerOtpStepSchema },
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				try {
					const result = await verifySignUpOtpAction({
						phone: value.phone,
						otp: value.otp,
					});
					if (result.isError) {
						toast.error(
							result.message ?? t("authTranslations.signUp.error.generic"),
						);
						return;
					}
					const params = new URLSearchParams(searchParams);
					params.set("vid", result.verificationId);
					router.push(`/sign-up?${params.toString()}`);
				} catch (error) {
					toast.error(
						error instanceof Error
							? error.message
							: t("authTranslations.signUp.error.generic"),
					);
				}
			});
		},
	});

	async function handleResendOtp() {
		startTransition(async () => {
			try {
				const result = await sendSignUpOtpAction({ phone });
				if (result.isError) {
					toast.error(
						result.message ?? t("authTranslations.signUp.error.generic"),
					);
					return;
				}
				toast.success(t("authTranslations.signUp.otpResent"));
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: t("authTranslations.signUp.error.generic"),
				);
			}
		});
	}

	// Step 3: Details form
	const detailsForm = useAppForm({
		defaultValues: {
			phone,
			verificationId,
			name: "",
			email: "",
			password: "",
		},
		validators: { onSubmit: customerDetailsStepSchema },
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				await signUpAction({
					...value,
					phone,
					verificationId,
				});
			});
		},
	});

	async function handleOAuthClick(provider: OAuthProvider) {
		await oAuthSignIn(provider);
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2 text-center">
				<H1>{t("authTranslations.signUp.title")}</H1>
				<Muted>
					{step === "otp" && t("authTranslations.signUp.otpStepDescription")}
					{step === "details" &&
						t("authTranslations.signUp.detailsStepDescription")}
				</Muted>
			</div>

			{searchParams.get("error") && (
				<FieldDescription
					aria-live="assertive"
					className="text-center text-destructive!"
					role="alert"
				>
					{searchParams.get("error")}
				</FieldDescription>
			)}

			{/* Step 1: Phone number */}
			{step === "phone" && (
				<>
					<div className="grid gap-2">
						{oAuthProviderValues.map((provider) => (
							<Button
								className="h-11 w-full justify-center gap-2"
								disabled={isPending}
								key={provider}
								onClick={async () => await handleOAuthClick(provider)}
								type="button"
								variant="outline"
							>
								{getOauthProviderIcon(provider)}
								<span className="font-medium text-sm capitalize">
									{provider}
								</span>
							</Button>
						))}
					</div>
					{oAuthProviderValues.length > 0 && (
						<>
							<FieldSeparator className="mb-2 *:data-[slot=field-separator-content]:bg-card">
								{t("authTranslations.signIn.continueWith")}
							</FieldSeparator>
						</>
					)}

					<form
						onSubmit={(e) => {
							e.preventDefault();
							phoneForm.handleSubmit();
						}}
					>
						<FieldSet className="grid gap-4" disabled={isPending}>
							<phoneForm.AppField name="phone">
								{(field) => (
									<field.MobileField
										autoFocus
										label={t("authTranslations.signUp.phoneLabel")}
									/>
								)}
							</phoneForm.AppField>

							<phoneForm.Subscribe selector={(state) => state.isSubmitting}>
								{(isSubmitting) => (
									<Button
										className="w-full"
										disabled={isPending || isSubmitting}
										type="submit"
									>
										{isPending || isSubmitting
											? t("authTranslations.signUp.sendingOtp")
											: t("authTranslations.signUp.sendOtp")}
									</Button>
								)}
							</phoneForm.Subscribe>
						</FieldSet>
					</form>
				</>
			)}

			{/* Step 2: OTP verification */}
			{step === "otp" && (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						otpForm.handleSubmit();
					}}
				>
					<FieldSet className="grid gap-4" disabled={isPending}>
						<Muted className="text-center">{phone}</Muted>

						<div dir="ltr">
							<otpForm.AppField name="otp">
								{(field) => (
									<InputOTP
										autoFocus
										containerClassName="justify-center"
										disabled={isPending}
										maxLength={6}
										onChange={(val) => field.handleChange(val)}
										value={field.state.value}
									>
										<InputOTPGroup>
											<InputOTPSlot index={0} />
											<InputOTPSlot index={1} />
											<InputOTPSlot index={2} />
										</InputOTPGroup>
										<InputOTPSeparator />
										<InputOTPGroup>
											<InputOTPSlot index={3} />
											<InputOTPSlot index={4} />
											<InputOTPSlot index={5} />
										</InputOTPGroup>
									</InputOTP>
								)}
							</otpForm.AppField>
						</div>

						<otpForm.Subscribe selector={(state) => state.isSubmitting}>
							{(isSubmitting) => (
								<Button
									className="w-full"
									disabled={isPending || isSubmitting}
									type="submit"
								>
									{isPending || isSubmitting
										? t("authTranslations.signUp.verifyingOtp")
										: t("authTranslations.signUp.verifyOtp")}
								</Button>
							)}
						</otpForm.Subscribe>

						<div className="flex items-center justify-between">
							<Button
								disabled={isPending}
								onClick={() => router.push("/sign-up")}
								type="button"
								variant="outline"
							>
								<ArrowLeftIcon />
								{t("authTranslations.signIn.back")}
							</Button>
							<Button
								disabled={isPending}
								onClick={handleResendOtp}
								type="button"
								variant="outline"
							>
								<RefreshCwIcon />
								{t("authTranslations.signUp.resendOtp")}
							</Button>
						</div>
					</FieldSet>
				</form>
			)}

			{/* Step 3: Account details */}
			{step === "details" && (
				<form
					onSubmit={(e) => {
						e.preventDefault();
						detailsForm.handleSubmit();
					}}
				>
					<FieldSet className="grid gap-2" disabled={isPending}>
						<detailsForm.AppField name="name">
							{(field) => (
								<field.StringField
									autoFocus
									label={t("authTranslations.signUp.nameLabel")}
								/>
							)}
						</detailsForm.AppField>

						<detailsForm.AppField name="email">
							{(field) => (
								<field.EmailField
									description={t("authTranslations.optional")}
									label={t("authTranslations.signUp.emailLabel")}
									placeholder={t("authTranslations.emailPlaceholder")}
								/>
							)}
						</detailsForm.AppField>

						<detailsForm.AppField name="password">
							{(field) => (
								<field.PasswordField
									label={t("authTranslations.signUp.passwordLabel")}
								/>
							)}
						</detailsForm.AppField>

						<detailsForm.Subscribe selector={(state) => state.isSubmitting}>
							{(isSubmitting) => (
								<Button
									className="w-full"
									disabled={isPending || isSubmitting}
									type="submit"
								>
									{isPending || isSubmitting
										? t("authTranslations.signUp.submitting")
										: t("authTranslations.signUp.submit")}
								</Button>
							)}
						</detailsForm.Subscribe>
					</FieldSet>
				</form>
			)}

			<FieldDescription className="text-center">
				{t("authTranslations.signIn.hasAccount")}{" "}
				<Link
					className="font-medium underline-offset-4 hover:underline"
					href={"/sign-in"}
				>
					{t("authTranslations.signUp.toSignIn")}
				</Link>
			</FieldDescription>
		</div>
	);
}
