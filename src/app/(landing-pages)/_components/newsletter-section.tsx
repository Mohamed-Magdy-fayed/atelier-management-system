"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/ui/containers";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";

export function NewsletterSection() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const trpc = useTRPC();

  const mutation = useMutation(
    trpc.subscribers.subscribe.mutationOptions({
      onSuccess: (data) => {
        if (data.alreadyActive) {
          toast.info(t("publicPages.newsletter.alreadySubscribed"));
        } else {
          toast.success(t("publicPages.newsletter.success"));
        }
        setEmail("");
      },
      onError: () => {
        toast.error(t("publicPages.newsletter.error"));
      },
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = z.string().email().safeParse(email);
    if (!result.success) {
      toast.error(t("publicPages.newsletter.invalidEmail"));
      return;
    }
    mutation.mutate({ email });
  }

  return (
    <Section variant="muted">
      <Container size="narrow" className="text-center">
        <h2 className="text-2xl font-bold md:text-3xl">
          {t("publicPages.newsletter.heading")}
        </h2>
        <p className="text-muted-foreground mt-3">
          {t("publicPages.newsletter.description")}
        </p>
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-3 sm:flex-row"
        >
          <Input
            type="email"
            placeholder={t("publicPages.newsletter.placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
          />
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="sm:w-auto"
          >
            {mutation.isPending
              ? t("publicPages.newsletter.subscribing")
              : t("publicPages.newsletter.subscribe")}
          </Button>
        </form>
        <p className="text-muted-foreground mt-3 text-xs">
          {t("publicPages.newsletter.noSpam")}
        </p>
      </Container>
    </Section>
  );
}
