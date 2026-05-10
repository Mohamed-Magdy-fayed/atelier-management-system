"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Status, StatusIndicator, StatusLabel } from "@/components/ui/status";
import { H3, H4 } from "@/components/ui/typography";
import { listOAuthConnectionsAction } from "@/features/core/auth/nextjs/actions";
import type { OAuthConnection } from "@/features/core/auth/types";
import { useTranslation } from "@/features/core/i18n/client";
import { OAuthConnectionControls } from "./oauth-connection-controls";

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

    useEffect(() => {
        startTransition(async () => {
            const res = await listOAuthConnectionsAction();
            if (res.isError) {
                setError(res.message);
                return;
            }
            setConnections(res.connections);
        });
    }, []);

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
                    <H4>{connection.displayName}</H4>
                    <Status variant={connection.connected ? "success" : "error"}>
                        <StatusIndicator />
                        <StatusLabel>{statusCopy}</StatusLabel>
                    </Status>
                    <OAuthConnectionControls
                        connected={connection.connected}
                        provider={connection.provider}
                        onDisconnected={async () => {
                            const res = await listOAuthConnectionsAction();
                            if (res.isError) {
                                setError(res.message);
                                return;
                            }
                            setConnections(res.connections);
                        }}
                    />
                </div>
            );
        });
    }, [t, connections.length, isPending, error, connections]);

    return (
        <div className="space-y-3">
            <H3>{t("authTranslations.oauth.connections.title")}</H3>
            {content}
        </div>
    );
}
