"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/features/core/i18n/client";

export function SandboxUnavailable() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-md p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>{String(t("sandbox.unavailableTitle"))}</CardTitle>
          <CardDescription>
            {String(t("sandbox.unavailableBody"))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/dresses" />}>
            {String(t("sandbox.unavailableCta"))}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
