"use client";

import {
	type ButtonHTMLAttributes,
	type ReactNode,
	useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { signOutAction } from "@/features/core/auth/nextjs/actions";
import { useTranslation } from "@/features/core/i18n/client";

type ButtonLikeProps = React.ComponentProps<typeof Button>;

type SignOutButtonProps = { children?: ReactNode } & Pick<
	ButtonLikeProps,
	"variant" | "size" | "className" | "disabled"
> &
	Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">;

export function SignOutButton({
	children,
	variant = "destructive",
	size,
	className,
	disabled,
	...buttonProps
}: SignOutButtonProps) {
	const { t } = useTranslation();

	const [isLoading, startTransition] = useTransition();

	const handleSignOut = async () => {
		startTransition(async () => {
			signOutAction();
		});
	};

	return (
		<Button
			className={className}
			disabled={disabled || isLoading}
			onClick={handleSignOut}
			size={size}
			variant={variant}
			{...buttonProps}
		>
			<LoadingSwap
				className="flex items-center justify-center gap-2"
				isLoading={!!disabled || isLoading}
			>
				{children ?? t("authTranslations.signOut")}
			</LoadingSwap>
		</Button>
	);
}
