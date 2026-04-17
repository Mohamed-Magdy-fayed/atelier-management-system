"use client";

import {
	type AuthenticationResponseJSON,
	startAuthentication,
} from "@simplewebauthn/browser";
import { ArrowLeftIcon, FingerprintIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Activity, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/hooks";
import { LinkButton } from "@/components/general/link-button";
import { Button } from "@/components/ui/button";
import {
	FieldDescription,
	FieldSeparator,
	FieldSet,
} from "@/components/ui/field";
import { H1, Muted } from "@/components/ui/typography";
import {
	beginPasskeyAuthenticationAction,
	completePasskeyAuthenticationAction,
	oAuthSignIn,
	signInAction,
} from "@/features/core/auth/nextjs/actions";
import { useOauthProviderIcon } from "@/features/core/auth/nextjs/components/useOauthProviderIcon";
import { signInSchema } from "@/features/core/auth/schemas";
import {
	type OAuthProvider,
	oAuthProviderValues,
} from "@/features/core/auth/tables";
import { useTranslation } from "@/features/core/i18n/react";

export function SignInForm() {
	const { t } = useTranslation();
	const [step, setStep] = useState<"phone" | "password">("phone");
	const [isPending, startPending] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const searchParams = useSearchParams();
	const getOauthProviderIcon = useOauthProviderIcon();
	const resetToastShownRef = useRef(false);

	useEffect(() => {
		if (searchParams.get("reset") !== "success") return;
		if (resetToastShownRef.current) return;

		resetToastShownRef.current = true;
		toast.success(t("authTranslations.passwordReset.reset.success"));
	}, [searchParams, t]);

	const form = useAppForm({
		defaultValues: { phone: "", password: "" },
		validators: { onSubmit: signInSchema },
		onSubmit: async ({ value }) => {
			startPending(async () => {
				setError(null);
				const result = await signInAction(value);
				if (result?.isError) {
					setError(result.message);
				}
			});
		},
	});

	async function handlePasskeySignIn() {
		const phone = form.getFieldValue("phone");
		if (!phone) {
			toast.error(t("authTranslations.passkeys.auth.error.phoneRequired"));
			return;
		}

		if (typeof window === "undefined" || !window.PublicKeyCredential) {
			toast.error(t("authTranslations.passkeys.auth.error.unsupported"));
			return;
		}

		startPending(async () => {
			let assertion: AuthenticationResponseJSON | null = null;
			try {
				const beginResult = await beginPasskeyAuthenticationAction(phone);

				if (beginResult.isError) {
					toast.error(beginResult.message);
					return;
				}

				assertion = await startAuthentication({
					optionsJSON: beginResult.options as any,
				});
			} catch (error) {
				error instanceof Error
					? toast.error(error.message)
					: toast.error(t("authTranslations.passkeys.auth.error.generic"));
			}

			if (!assertion) {
				toast.error(t("authTranslations.passkeys.auth.error.generic"));
				return;
			}
			await completePasskeyAuthenticationAction(phone, assertion);
		});
	}

	async function handleOAuthClick(provider: OAuthProvider) {
		await oAuthSignIn(provider);
	}

	async function handleContinuePhone() {
		const phone = form.getFieldValue("phone");
		if (!phone) {
			toast.error(t("authTranslations.signIn.phoneRequired"));
			return;
		}
		setStep("password");

		setTimeout(() => {
			const passwordInput = document.getElementById(
				"password",
			) as HTMLInputElement;
			passwordInput?.focus();
		}, 100);
	}

	function handleBackToPhone() {
		setStep("phone");
	}

	const isPhoneStep = step === "phone";

	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				if (step === "phone") {
					handleContinuePhone();
				} else {
					form.handleSubmit();
				}
			}}
		>
			<div className="space-y-2 text-center">
				<H1>{t("authTranslations.signIn.title")}</H1>
				<Muted>{t("authTranslations.signIn.description")}</Muted>
			</div>

			{error && (
				<FieldDescription
					aria-live="assertive"
					className="text-center text-destructive!"
					role="alert"
				>
					{error}
				</FieldDescription>
			)}
			{searchParams.get("error") != null && (
				<FieldDescription
					aria-live="assertive"
					className="text-center text-destructive!"
					role="alert"
				>
					{searchParams.get("error")}
				</FieldDescription>
			)}
			{searchParams.get("oauthError") != null && (
				<FieldDescription
					aria-live="assertive"
					className="text-center text-destructive!"
					role="alert"
				>
					{searchParams.get("oauthError")}
				</FieldDescription>
			)}

			{oAuthProviderValues.length > 0 && (
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
							<span className="font-medium text-sm capitalize">{provider}</span>
						</Button>
					))}
				</div>
			)}

			<FieldSeparator className="mb-2 *:data-[slot=field-separator-content]:bg-card">
				{t("authTranslations.signIn.continueWith")}
			</FieldSeparator>

			<FieldSet className="grid gap-4" disabled={isPending}>
				<Activity mode={isPhoneStep ? "visible" : "hidden"}>
					<form.AppField name="phone">
						{(field) => (
							<field.MobileField
								autoFocus
								label={t("authTranslations.signIn.phoneLabel")}
							/>
						)}
					</form.AppField>

					<Button
						className="w-full"
						disabled={isPending}
						onClick={handleContinuePhone}
						type="button"
					>
						{t("authTranslations.signIn.continue")}
					</Button>
				</Activity>

				<Activity mode={isPhoneStep ? "hidden" : "visible"}>
					<form.AppField name="password">
						{(field) => (
							<field.PasswordField
								label={t("authTranslations.signIn.passwordLabel")}
							/>
						)}
					</form.AppField>

					<div className="flex w-full justify-end">
						<LinkButton href="/forgot-password" size="sm" variant="link">
							{t("authTranslations.signIn.forgotPassword")}
						</LinkButton>
					</div>

					<div className="flex items-center gap-2">
						<Button
							disabled={isPending}
							onClick={handleBackToPhone}
							type="button"
							variant="outline"
						>
							<ArrowLeftIcon className="rtl:rotate-180" />
							{t("authTranslations.signIn.back")}
						</Button>
						<Button className="flex-1" disabled={isPending} type="submit">
							{t("authTranslations.signIn.submit")}
						</Button>
					</div>
				</Activity>

				<Button
					disabled={isPending}
					onClick={handlePasskeySignIn}
					type="button"
					variant="outline"
				>
					<FingerprintIcon />
					{isPending
						? t("authTranslations.passkeys.auth.pending")
						: t("authTranslations.passkeys.auth.button")}
				</Button>
			</FieldSet>

			<FieldDescription className="text-center">
				{t("authTranslations.signIn.noAccount")}{" "}
				<LinkButton className="ps-0" href="/sign-up" variant="link">
					{t("authTranslations.signIn.toSignUp")}
				</LinkButton>
			</FieldDescription>
		</form>
	);
}
