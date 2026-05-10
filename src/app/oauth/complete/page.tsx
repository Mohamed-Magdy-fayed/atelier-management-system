"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

type OAuthConnectCompleteMessage = {
    type: "oauth:connect-complete";
    status: "success" | "error";
    provider?: string;
    message?: string;
};

export default function OAuthCompletePage() {
    const searchParams = useSearchParams();
    const status = searchParams.get("status") === "success" ? "success" : "error";
    const provider = searchParams.get("provider") ?? undefined;
    const message = searchParams.get("message") ?? undefined;

    useEffect(() => {
        const payload: OAuthConnectCompleteMessage = {
            type: "oauth:connect-complete",
            status,
            provider,
            message,
        };

        if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, window.location.origin);
        }

        const timeout = window.setTimeout(() => {
            window.close();
        }, 400);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [status, provider, message]);

    const title =
        status === "success" ? "Account connected" : "Connection failed";
    const description =
        status === "success"
            ? "This window will close automatically."
            : message || "Unable to connect your account. You can close this window.";

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <section className="w-full max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
                <h1 className="font-semibold text-2xl">{title}</h1>
                <p className="mt-2 text-muted-foreground text-sm">{description}</p>
            </section>
        </main>
    );
}
