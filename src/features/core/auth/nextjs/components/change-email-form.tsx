"use client";

import {
	type FormEvent,
	useCallback,
	useMemo,
	useState,
	useTransition,
} from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/forms/hooks";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSet,
} from "@/components/ui/field";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import { beginEmailChangeAction } from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { changeEmailSchema } from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";

export function ChangeEmailForm() {
	const { t } = useTranslation();
	const { session } = useAuth();

	const currentEmail = session?.user.email;
	const hasEmail = !!currentEmail;
	const [status, setStatus] = useState<"idle" | "sent">("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();

	const form = useAppForm({
		defaultValues: {
			newEmail: "",
			confirmEmail: "",
			currentPassword: "",
		},
		validators: {
			onSubmit: changeEmailSchema,
		},
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				setErrorMessage(null);
				setStatus("idle");
				try {
					const res = await beginEmailChangeAction(value);
					if (res.isError) {
						setErrorMessage(
							res.message ?? t("authTranslations.profile.email.error.generic"),
						);
						return;
					}
					setStatus("sent");
					toast.success(t("authTranslations.emailVerification.sent"));
				} catch (error) {
					setErrorMessage(
						error instanceof Error
							? error.message
							: t("authTranslations.profile.email.error.generic"),
					);
				}
			});
		},
	});

	const handleSubmit = useCallback(
		(e: FormEvent) => {
			e.preventDefault();
			form.handleSubmit();
		},
		[form],
	);

	const description = useMemo(() => {
		if (errorMessage) return errorMessage;
		if (status === "sent")
			return t("authTranslations.profile.email.checkInbox");
		return hasEmail
			? t("authTranslations.profile.email.description")
			: t("authTranslations.profile.email.addDescription");
	}, [errorMessage, hasEmail, status, t]);

	return (
		<form className="space-y-6" onSubmit={handleSubmit}>
			<p>{description}</p>
			<FieldSet className="space-y-6" disabled={isPending}>
				<FieldGroup>
					{hasEmail ? (
						<FieldDescription className="text-start text-muted-foreground text-sm">
							{t("authTranslations.profile.email.current")} {currentEmail}
						</FieldDescription>
					) : (
						<FieldDescription className="text-start text-muted-foreground text-sm">
							{t("authTranslations.profile.email.noCurrent")}
						</FieldDescription>
					)}

					<form.AppField name="newEmail">
						{(field) => (
							<field.EmailField
								autoFocus
								label={
									hasEmail
										? t("authTranslations.profile.email.newLabel")
										: t("authTranslations.profile.email.addLabel")
								}
								placeholder={t("authTranslations.emailPlaceholder")}
							/>
						)}
					</form.AppField>

					<form.AppField name="confirmEmail">
						{(field) => (
							<field.EmailField
								label={t("authTranslations.profile.email.confirmLabel")}
								placeholder={t("authTranslations.emailPlaceholder")}
							/>
						)}
					</form.AppField>

					<form.AppField name="currentPassword">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							const errors = field.state.meta.errors.flatMap((error) => {
								if (!error) return [];
								if (typeof error === "string") return [{ message: error }];
								return [error as { message?: string }];
							});

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										{t("authTranslations.profile.email.currentPasswordLabel")}
									</FieldLabel>
									<InputGroup>
										<InputGroupInput
											aria-invalid={isInvalid}
											autoComplete="current-password"
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											type="password"
											value={field.state.value}
										/>
									</InputGroup>
									<FieldError errors={errors} />
								</Field>
							);
						}}
					</form.AppField>
				</FieldGroup>
				<ButtonGroup className="justify-end">
					<Button disabled={isPending} type="submit">
						{isPending
							? t("authTranslations.profile.email.sending")
							: hasEmail
								? t("authTranslations.profile.email.submit")
								: t("authTranslations.profile.email.addSubmit")}
					</Button>
				</ButtonGroup>
			</FieldSet>
		</form>
	);
}
