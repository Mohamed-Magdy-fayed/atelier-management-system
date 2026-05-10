"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";
import { listOAuthConnectionsAction } from "@/features/core/auth/nextjs/actions";
import type { OAuthConnection } from "@/features/core/auth/types";
import { useTranslation } from "@/features/core/i18n/client";
import { OAuthConnectionControls } from "./oauth-connection-controls";

type OAuthConnectCompleteEvent = {
    type: "oauth:connect-complete";
    status: "success" | "error";
    message?: string;
};

function formatDate(value: Date | null) {
    if (!value) return null;
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

export function OAuthConnections() {
    const { t } = useTranslation();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string>();
    const [connections, setConnections] = useState<OAuthConnection[]>([]);

    const refreshConnections = useCallback(() => {
        startTransition(async () => {
            const res = await listOAuthConnectionsAction();
            if (res.isError) {
                setError(res.message);
                return;
            }

            setError(undefined);
            setConnections(res.connections);
        });
    }, []);

    useEffect(() => {
        refreshConnections();
    }, [refreshConnections]);

    useEffect(() => {
        function handleOAuthComplete(event: MessageEvent<OAuthConnectCompleteEvent>) {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== "oauth:connect-complete") return;

            if (event.data.status === "error") {
                toast.error(
                    event.data.message || t("authTranslations.oauth.error.connectFailed"),
                );
            } else {
                toast.success(t("authTranslations.oauth.connections.connected"));
            }

            refreshConnections();
        }

        window.addEventListener("message", handleOAuthComplete);
        return () => window.removeEventListener("message", handleOAuthComplete);
    }, [refreshConnections, t]);

    const content = useMemo(() => {
        if (isPending) {
            return (
                <p className="text-muted-foreground text-sm">
                    {t("authTranslations.oauth.connections.loading")}
                </p>
            );
        }

        if (error) {
            return (
                <p className="text-destructive text-sm">
                    {error || t("authTranslations.oauth.connections.loadError")}
                </p>
            );
        }

        if (connections.length === 0) {
            return (
                <p className="text-muted-foreground text-sm">
                    {t("authTranslations.oauth.connections.empty")}
                </p>
            );
        }

        return connections.map((connection) => {
            const connectedAt = formatDate(connection.connectedAt ?? null);
            const statusCopy = connection.connected
                ? connectedAt
                    ? t("authTranslations.oauth.connections.connectedAt", {
                        date: connectedAt,
                    })
                    : t("authTranslations.oauth.connections.connected")
                : t("authTranslations.oauth.connections.notConnected");

            return (
                <div
                    className="flex gap-2 items-center justify-between rounded-md border border-muted-foreground/20 p-3"
                    key={connection.provider}
                >
                    <Status variant={connection.connected ? "success" : "error"}>
                        <StatusIndicator />
                        <StatusLabel>{statusCopy}</StatusLabel>
                    </Status>
                    <OAuthConnectionControls
                        connected={connection.connected}
                        provider={connection.provider}
                        onDisconnected={refreshConnections}
                    />
                </div>
            );
        });
    }, [t, connections.length, isPending, error, connections, refreshConnections]);

    return content;
}
