"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";

export function ContactForm() {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  const mutation = useMutation(
    trpc.leads.submit.mutationOptions({
      onSuccess: () => {
        toast.success(t("publicPages.contactPage.formSuccess"));
        setForm({ name: "", email: "", company: "", phone: "", message: "" });
      },
      onError: (err) => {
        toast.error(err.message || t("publicPages.contactPage.formError"));
      },
    }),
  );

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error(t("publicPages.contactPage.formValidation"));
      return;
    }
    mutation.mutate({ ...form, source: "contact-form" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">
            {t("publicPages.contactPage.formNameLabel")} *
          </Label>
          <Input
            id="name"
            name="name"
            placeholder={t("publicPages.contactPage.formNamePlaceholder")}
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">
            {t("publicPages.contactPage.formEmailLabel")} *
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t("publicPages.contactPage.formEmailPlaceholder")}
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company">
            {t("publicPages.contactPage.formCompanyLabel")}
          </Label>
          <Input
            id="company"
            name="company"
            placeholder={t("publicPages.contactPage.formCompanyPlaceholder")}
            value={form.company}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            {t("publicPages.contactPage.formPhoneLabel")}
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder={t("publicPages.contactPage.formPhonePlaceholder")}
            value={form.phone}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">
          {t("publicPages.contactPage.formMessageLabel")} *
        </Label>
        <Textarea
          id="message"
          name="message"
          placeholder={t("publicPages.contactPage.formMessagePlaceholder")}
          rows={5}
          value={form.message}
          onChange={handleChange}
          required
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending
          ? t("publicPages.contactPage.formSubmitting")
          : t("publicPages.contactPage.formSubmit")}
      </Button>

      <p className="text-muted-foreground text-center text-xs">
        {t("publicPages.contactPage.formDisclaimer")}
      </p>
    </form>
  );
}
