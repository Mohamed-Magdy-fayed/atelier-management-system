"use client";

import { useRouter } from "next/navigation";
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
    FieldDescription,
    FieldGroup,
    FieldSet,
} from "@/components/ui/field";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import {
    beginPhoneChangeAction,
    confirmPhoneChangeAction,
} from "@/features/core/auth/nextjs/actions";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import {
    beginPhoneChangeSchema,
    confirmPhoneChangeSchema,
} from "@/features/core/auth/schemas";
import { useTranslation } from "@/features/core/i18n/react";

type Step = "begin" | "confirm";

export function ChangePhoneForm({ onDone }: { onDone?: () => void }) {
    const { t } = useTranslation();
    const router = useRouter();
    const { session } = useAuth();
    const currentPhone = session?.user.phone ?? "";

    const [step, setStep] = useState<Step>("begin");
    const [pendingPhone, setPendingPhone] = useState<string>("");
    const [isPending, startTransition] = useTransition();

    const beginForm = useAppForm({
        defaultValues: { phone: "" },
        validators: {
            onSubmit: beginPhoneChangeSchema,
        },
        onSubmit: async ({ value }) => {
            startTransition(async () => {
                try {
                    const res = await beginPhoneChangeAction({ phone: value.phone });
                    if (res.isError) {
                        toast.error(
                            res.message ?? t("authTranslations.profile.phone.error.invalid"),
                        );
                        return;
                    }

                    setPendingPhone(res.phone);
                    setStep("confirm");

                    // Keep confirm form in sync with the phone we just sent OTP to.
                    confirmForm.setFieldValue("phone", res.phone);
                    confirmForm.setFieldValue("otp", "");

                    toast.success(t("authTranslations.profile.phone.otpSent"));
                } catch (error) {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : t("authTranslations.profile.phone.error.invalid"),
                    );
                }
            });
        },
    });

    const confirmForm = useAppForm({
        defaultValues: { phone: "", otp: "" },
        validators: {
            onSubmit: confirmPhoneChangeSchema,
        },
        onSubmit: async ({ value }) => {
            startTransition(async () => {
                try {
                    const res = await confirmPhoneChangeAction({
                        phone: value.phone,
                        otp: value.otp,
                    });
                    if (res.isError) {
                        toast.error(
                            res.message ??
                            t("authTranslations.profile.phone.error.otpInvalid"),
                        );
                        return;
                    }

                    toast.success(t("authTranslations.profile.phone.success"));
                    onDone?.();
                    setStep("begin");
                    setPendingPhone("");
                    beginForm.setFieldValue("phone", "");
                    router.refresh();
                } catch (error) {
                    toast.error(
                        error instanceof Error
                            ? error.message
                            : t("authTranslations.profile.phone.error.otpInvalid"),
                    );
                }
            });
        },
    });

    const description = useMemo(() => {
        return currentPhone
            ? t("authTranslations.profile.phone.current", { phone: currentPhone })
            : t("authTranslations.profile.phone.noCurrent");
    }, [currentPhone, t]);

    const handleBeginSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            beginForm.handleSubmit();
        },
        [beginForm],
    );

    const handleConfirmSubmit = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            confirmForm.handleSubmit();
        },
        [confirmForm],
    );

    return (
        <div className="space-y-6">
            <p className="text-muted-foreground text-sm">{description}</p>

            {step === "begin" ? (
                <form className="space-y-5" onSubmit={handleBeginSubmit}>
                    <FieldSet disabled={isPending}>
                        <FieldGroup>
                            <beginForm.AppField name="phone">
                                {(field) => (
                                    <field.MobileField
                                        autoFocus
                                        label={t("authTranslations.profile.phone.newLabel")}
                                        placeholder={t(
                                            "authTranslations.profile.phone.placeholder",
                                        )}
                                    />
                                )}
                            </beginForm.AppField>
                        </FieldGroup>
                        <ButtonGroup className="justify-end">
                            <Button disabled={isPending} type="submit">
                                {isPending
                                    ? t("authTranslations.profile.phone.sending")
                                    : t("authTranslations.profile.phone.sendOtp")}
                            </Button>
                        </ButtonGroup>
                    </FieldSet>
                </form>
            ) : (
                <form className="space-y-5" onSubmit={handleConfirmSubmit}>
                    <FieldSet disabled={isPending}>
                        <FieldGroup>
                            <FieldDescription className="text-start text-muted-foreground text-sm">
                                {t("authTranslations.profile.phone.verifyingFor")}{" "}
                                {pendingPhone}
                            </FieldDescription>
                            <confirmForm.AppField name="phone">
                                {(field) => (
                                    <input
                                        name={field.name}
                                        type="hidden"
                                        value={field.state.value}
                                    />
                                )}
                            </confirmForm.AppField>

                            <div dir="ltr">
                                <confirmForm.AppField name="otp">
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
                                </confirmForm.AppField>
                            </div>
                        </FieldGroup>
                        <ButtonGroup className="justify-end">
                            <Button
                                disabled={isPending}
                                onClick={() => {
                                    setStep("begin");
                                    setPendingPhone("");
                                    confirmForm.setFieldValue("phone", "");
                                    confirmForm.setFieldValue("otp", "");
                                }}
                                type="button"
                                variant="outline"
                            >
                                {t("authTranslations.signIn.back")}
                            </Button>
                            <Button disabled={isPending} type="submit">
                                {isPending
                                    ? t("authTranslations.profile.phone.verifying")
                                    : t("authTranslations.profile.phone.verifyOtp")}
                            </Button>
                        </ButtonGroup>
                    </FieldSet>
                </form>
            )}
        </div>
    );
}
