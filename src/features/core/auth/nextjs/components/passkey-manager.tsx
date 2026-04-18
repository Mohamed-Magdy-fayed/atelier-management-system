"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { startTransition, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    beginPasskeyRegistrationAction,
    completePasskeyRegistrationAction,
    deletePasskeyAction,
    listPasskeysAction,
} from "@/features/core/auth/nextjs/actions/passkey";
import type { PasskeyListItem } from "@/features/core/auth/types";
import { useTranslation } from "@/features/core/i18n/client";

export function PasskeyManager() {
    const { t } = useTranslation();
    const [passkeys, setPasskeys] = useState<PasskeyListItem[]>([]);
    const [isRegistering, setIsRegistering] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    async function refreshPasskeys() {
        const res = await listPasskeysAction();
        if (res.isError) {
            return toast.error(res.message);
        }

        setPasskeys(res.data);
    }

    async function handleRegister() {
        if (typeof window === "undefined" || !window.PublicKeyCredential) {
            toast.error(t("authTranslations.passkeys.register.unsupported"));
            return;
        }

        try {
            setIsRegistering(true);

            const optionsResult = await beginPasskeyRegistrationAction();
            if (optionsResult.isError) {
                toast.error(optionsResult.message);
                return;
            }

            const attestation = await startRegistration({
                optionsJSON: optionsResult.options as any,
            });
            const completion = await completePasskeyRegistrationAction(attestation);

            if (completion.isError) {
                toast.error(completion.message);
                return;
            }

            await refreshPasskeys();
            toast.success(t("authTranslations.passkeys.register.success"));
        } catch (caught) {
            if (
                caught instanceof DOMException &&
                (caught.name === "AbortError" || caught.name === "NotAllowedError")
            ) {
                toast.error(t("authTranslations.passkeys.register.cancelled"));
                return;
            }

            console.error("Passkey registration failed", caught);
            toast.error(t("authTranslations.passkeys.register.error"));
        } finally {
            setIsRegistering(false);
        }
    }

    async function handleDelete(id: string) {
        setBusyId(id);

        try {
            const result = await deletePasskeyAction({ passkeyId: id });
            if (result.isError) {
                toast.error(result.message);
                return;
            }

            await refreshPasskeys();
            toast.success(result.message);
        } catch (caught) {
            console.error("Passkey removal failed", caught);
            toast.error(t("authTranslations.passkeys.delete.error"));
        } finally {
            setBusyId(null);
        }
    }

    useEffect(() => {
        startTransition(async () => {
            refreshPasskeys();
        });
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                    {t("authTranslations.passkeys.settings.description")}
                </p>
            </div>
            <ul className="space-y-3">
                {passkeys.length === 0 && (
                    <li className="rounded border border-dashed px-3 py-4 text-muted-foreground text-sm">
                        {t("authTranslations.passkeys.list.empty")}
                    </li>
                )}
                {passkeys.map((item) => (
                    <li
                        className="flex flex-wrap items-center justify-between gap-3 rounded border px-3 py-2"
                        key={item.id}
                    >
                        <div className="space-y-1">
                            <p className="font-medium">
                                {item.label ?? t("authTranslations.passkeys.list.defaultLabel")}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {t("authTranslations.passkeys.list.created")}{" "}
                                {new Date(item.createdAt).toLocaleString()}
                            </p>
                            {item.lastUsedAt && (
                                <p className="text-muted-foreground text-xs">
                                    {t("authTranslations.passkeys.list.lastUsed")}{" "}
                                    {new Date(item.lastUsedAt).toLocaleString()}
                                </p>
                            )}
                        </div>
                        <Button
                            disabled={busyId === item.id}
                            onClick={() => handleDelete(item.id)}
                            variant="outline"
                        >
                            {busyId === item.id
                                ? t("authTranslations.passkeys.deleting")
                                : t("authTranslations.passkeys.delete.label")}
                        </Button>
                    </li>
                ))}
            </ul>

            <Button disabled={isRegistering} onClick={handleRegister}>
                {isRegistering
                    ? t("authTranslations.passkeys.registering")
                    : t("authTranslations.passkeys.add")}
            </Button>
        </div>
    );
}
