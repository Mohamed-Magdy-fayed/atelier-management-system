"use client";

import { UserLockIcon } from "lucide-react";
import {
	type FormEventHandler,
	type ReactElement,
	useCallback,
	useId,
	useTransition,
} from "react";
import { toast } from "sonner";

import { useAppForm } from "@/components/forms/hooks";
import {
	OverlayFormBody,
	OverlayFormSubmitButton,
} from "@/components/forms/overlay-form";
import { SystemDialog } from "@/components/general/system-dialog";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { LoadingSwap } from "@/components/ui/loading-swap";
import {
	changePasswordAction,
	createPasswordAction,
} from "@/features/core/auth/nextjs/actions";
import {
	changePasswordSchema,
	createPasswordSchema,
} from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/client";
import { cn } from "@/lib/utils";

function CreatePasswordFormDialog({
	callback,
	isOpen,
	onOpenChange,
	titleRender,
}: {
	callback?: () => void;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	titleRender: () => ReactElement;
}) {
	const { t } = useTranslation();
	const formId = useId();
	const [isPending, startTransition] = useTransition();

	const form = useAppForm({
		defaultValues: {
			newPassword: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: createPasswordSchema,
		},
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				const result = await createPasswordAction(value);
				if (result.isError) {
					toast.error(result.message ?? t("error", { error: "" }));
					return;
				}

				toast.success(t("authTranslations.profile.password.submit"));
				form.reset();
				onOpenChange(false);
				callback?.();
			});
		},
	});

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		(e) => {
			e.preventDefault();
			form.handleSubmit();
		},
		[form],
	);

	return (
		<form.AppForm>
			<SystemDialog
				isOpen={isOpen}
				onOpenChange={onOpenChange}
				titleRender={titleRender}
				actions={
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<OverlayFormSubmitButton
								className="w-full"
								disabled={isPending || isSubmitting}
								formId={formId}
							>
								<LoadingSwap
									isLoading={isPending || isSubmitting}
									loadingText={t(
										"authTranslations.profile.password.updating",
									)}
								>
									<UserLockIcon />
									{t("authTranslations.profile.password.submit")}
								</LoadingSwap>
							</OverlayFormSubmitButton>
						)}
					</form.Subscribe>
				}
			>
				<OverlayFormBody
					className={cn("space-y-4")}
					formId={formId}
					onSubmit={handleSubmit}
				>
					<FieldSet disabled={isPending}>
						<FieldGroup>
							<form.AppField name="newPassword">
								{(field) => (
									<field.PasswordField
										label={t(
											"authTranslations.profile.password.newLabel",
										)}
									/>
								)}
							</form.AppField>

							<form.AppField name="confirmPassword">
								{(field) => (
									<field.PasswordField
										label={t(
											"authTranslations.profile.password.confirmLabel",
										)}
									/>
								)}
							</form.AppField>
						</FieldGroup>
					</FieldSet>
				</OverlayFormBody>
			</SystemDialog>
		</form.AppForm>
	);
}

function UpdatePasswordFormDialog({
	callback,
	isOpen,
	onOpenChange,
	titleRender,
}: {
	callback?: () => void;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	titleRender: () => ReactElement;
}) {
	const { t } = useTranslation();
	const formId = useId();
	const [isPending, startTransition] = useTransition();

	const form = useAppForm({
		defaultValues: {
			currentPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
		validators: {
			onSubmit: changePasswordSchema,
		},
		onSubmit: async ({ value }) => {
			startTransition(async () => {
				const result = await changePasswordAction(value);
				if (result.isError) {
					toast.error(result.message ?? t("error", { error: "" }));
					return;
				}

				toast.success(t("authTranslations.profile.password.submit"));
				form.reset();
				onOpenChange(false);
				callback?.();
			});
		},
	});

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		(e) => {
			e.preventDefault();
			form.handleSubmit();
		},
		[form],
	);

	return (
		<form.AppForm>
			<SystemDialog
				isOpen={isOpen}
				onOpenChange={onOpenChange}
				titleRender={titleRender}
				actions={
					<form.Subscribe selector={(state) => state.isSubmitting}>
						{(isSubmitting) => (
							<OverlayFormSubmitButton
								className="w-full"
								disabled={isPending || isSubmitting}
								formId={formId}
							>
								<LoadingSwap
									isLoading={isPending || isSubmitting}
									loadingText={t(
										"authTranslations.profile.password.updating",
									)}
								>
									<UserLockIcon />
									{t("authTranslations.profile.password.submit")}
								</LoadingSwap>
							</OverlayFormSubmitButton>
						)}
					</form.Subscribe>
				}
			>
				<OverlayFormBody
					className={cn("space-y-4")}
					formId={formId}
					onSubmit={handleSubmit}
				>
					<FieldSet disabled={isPending}>
						<FieldGroup>
							<form.AppField name="currentPassword">
								{(field) => (
									<field.PasswordField
										label={t(
											"authTranslations.profile.password.currentLabel",
										)}
									/>
								)}
							</form.AppField>

							<form.AppField name="newPassword">
								{(field) => (
									<field.PasswordField
										label={t(
											"authTranslations.profile.password.newLabel",
										)}
									/>
								)}
							</form.AppField>

							<form.AppField name="confirmPassword">
								{(field) => (
									<field.PasswordField
										label={t(
											"authTranslations.profile.password.confirmLabel",
										)}
									/>
								)}
							</form.AppField>
						</FieldGroup>
					</FieldSet>
				</OverlayFormBody>
			</SystemDialog>
		</form.AppForm>
	);
}

export function ChangePasswordFormDialog({
	callback,
	isCreate,
	isOpen,
	onOpenChange,
	titleRender,
}: {
	callback?: () => void;
	isCreate: boolean;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	titleRender: () => ReactElement;
}) {
	if (isCreate) {
		return (
			<CreatePasswordFormDialog
				callback={callback}
				isOpen={isOpen}
				onOpenChange={onOpenChange}
				titleRender={titleRender}
			/>
		);
	}

	return (
		<UpdatePasswordFormDialog
			callback={callback}
			isOpen={isOpen}
			onOpenChange={onOpenChange}
			titleRender={titleRender}
		/>
	);
}
