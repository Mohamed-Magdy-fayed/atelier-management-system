"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { OAuthProvider } from "@/drizzle/schema";
import {
  disconnectOAuthAccountAction,
  getOAuthConnectUrlAction,
} from "@/features/core/auth/nextjs/actions";
import { useTranslation } from "@/features/core/i18n/client";

type OAuthConnectionControlsProps = {
  provider: OAuthProvider;
  connected: boolean;
  onDisconnected?: (provider: OAuthProvider, message?: string) => void;
};

export function OAuthConnectionControls({
  provider,
  connected,
  onDisconnected,
}: OAuthConnectionControlsProps) {
  const { t } = useTranslation();
  const [isPending, startTransition] = useTransition();

  function openOAuthPopup(url: string) {
    const width = 520;
    const height = 700;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    return window.open(
      url,
      "oauth-connect",
      `popup=yes,width=${width},height=${height},left=${Math.round(left)},top=${Math.round(top)}`,
    );
  }

  function startOAuth() {
    startTransition(async () => {
      const res = await getOAuthConnectUrlAction(provider);

      if (res.isError) {
        toast.error(res.message);
        return;
      }

      const popup = openOAuthPopup(res.url);

      if (popup) {
        popup.focus();
        return;
      }

      window.location.assign(res.url);
    });
  }

  function disconnectOAuth() {
    startTransition(async () => {
      const res = await disconnectOAuthAccountAction(provider);

      if (res.isError) {
        toast.error(res.message);
        return;
      }

      toast.success(t("authTranslations.oauth.connections.disconnectSuccess"));
      onDisconnected?.(provider);
    });
  }

  if (connected) {
    return (
      <Button
        disabled={isPending}
        onClick={disconnectOAuth}
        size="sm"
        variant="destructive"
      >
        {isPending
          ? t("authTranslations.oauth.connections.disconnecting")
          : t("authTranslations.oauth.connections.disconnect")}
      </Button>
    );
  }

  return (
    <Button
      disabled={isPending}
      onClick={startOAuth}
      size="sm"
      variant="outline"
    >
      {isPending
        ? t("authTranslations.oauth.connections.connecting")
        : t("authTranslations.oauth.connections.connect")}
    </Button>
  );
}
