"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAppForm } from "@/components/forms/hooks";
import {
  OverlayFormBody,
  OverlayFormFooterActions,
  OverlayFormSubmitButton,
} from "@/components/forms/overlay-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { Testimonial } from "@/integrations/trpc/routers/testimonials";

const formSchema = z.object({
  clientName: z.string().trim().min(1).max(255),
  company: z.string().trim().min(1).max(255),
  role: z.string().trim().max(128).optional().nullable(),
  content: z.string().trim().min(1).max(1024),
  avatarUrl: z.string().max(1024).optional().nullable(),
  sortOrder: z.number().int().min(0),
  isVisible: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  testimonial?: Testimonial | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function TestimonialFormDialog({
  testimonial,
  onOpenChange,
  open,
}: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const formId = useId();
  const isEdit = testimonial != null;

  const createMut = useMutation(trpc.testimonials.create.mutationOptions());
  const updateMut = useMutation(trpc.testimonials.update.mutationOptions());
  const pending = createMut.isPending || updateMut.isPending;

  const defaultValues = useMemo<FormValues>(
    () => ({
      clientName: "",
      company: "",
      role: null,
      content: "",
      avatarUrl: null,
      sortOrder: 0,
      isVisible: true,
    }),
    [],
  );

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      try {
        const payload = {
          ...value,
          role: value.role || null,
          avatarUrl: value.avatarUrl || null,
        };
        if (isEdit && testimonial) {
          await toast
            .promise(
              updateMut.mutateAsync({ id: testimonial.id, ...payload }),
              {
                loading: String(t("common.saving")),
                success: String(t("testimonials.testimonialUpdated")),
                error: String(t("testimonials.testimonialSaveFailed")),
              },
            )
            .unwrap();
        } else {
          await toast
            .promise(createMut.mutateAsync(payload), {
              loading: String(t("common.saving")),
              success: String(t("testimonials.testimonialCreated")),
              error: String(t("testimonials.testimonialSaveFailed")),
            })
            .unwrap();
        }
        await qc.invalidateQueries({ queryKey: trpc.testimonials.pathKey() });
        onOpenChange(false);
      } catch {
        /* surfaced */
      }
    },
  });

  const resetToTestimonial = useCallback(() => {
    if (!testimonial) return;
    form.reset({
      clientName: testimonial.clientName,
      company: testimonial.company,
      role: testimonial.role ?? null,
      content: testimonial.content,
      avatarUrl: testimonial.avatarUrl ?? null,
      sortOrder: testimonial.sortOrder,
      isVisible: testimonial.isVisible,
    });
  }, [testimonial, form]);

  useEffect(() => {
    if (open && isEdit && testimonial) resetToTestimonial();
    else if (open && !isEdit) form.reset(defaultValues);
  }, [open, isEdit, testimonial, resetToTestimonial, form, defaultValues]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    void form.handleSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>
            {String(
              t(
                isEdit
                  ? "testimonials.editTestimonial"
                  : "testimonials.addTestimonial",
              ),
            )}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit
                  ? "testimonials.editTestimonialDescription"
                  : "testimonials.addTestimonialDescription",
              ),
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-auto">
          <OverlayFormBody
            formId={formId}
            onSubmit={handleSubmit}
            className="space-y-4 p-6"
          >
            <FieldSet disabled={pending}>
              <FieldGroup>
                <form.AppField name="clientName">
                  {(field) => (
                    <field.StringField
                      label={String(t("testimonials.clientName"))}
                      placeholder={String(
                        t("testimonials.clientNamePlaceholder"),
                      )}
                    />
                  )}
                </form.AppField>
                <form.AppField name="company">
                  {(field) => (
                    <field.StringField
                      label={String(t("testimonials.company"))}
                      placeholder={String(t("testimonials.companyPlaceholder"))}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
              <form.Field name="role">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      {String(t("testimonials.role"))}
                    </FieldLabel>
                    <Input
                      id={field.name}
                      value={(field.state.value as string) ?? ""}
                      onChange={(e) =>
                        field.handleChange(e.target.value || null)
                      }
                      onBlur={field.handleBlur}
                      placeholder={String(t("testimonials.rolePlaceholder"))}
                    />
                  </Field>
                )}
              </form.Field>
              <form.AppField name="content">
                {(field) => (
                  <field.TextareaField
                    label={String(t("testimonials.content"))}
                    placeholder={String(t("testimonials.contentPlaceholder"))}
                    rows={4}
                  />
                )}
              </form.AppField>
              <FieldGroup>
                <form.Field name="avatarUrl">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {String(t("testimonials.avatarUrl"))}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        value={(field.state.value as string) ?? ""}
                        onChange={(e) =>
                          field.handleChange(e.target.value || null)
                        }
                        onBlur={field.handleBlur}
                        placeholder="https://..."
                      />
                    </Field>
                  )}
                </form.Field>
                <form.AppField name="sortOrder">
                  {(field) => (
                    <field.NumberField
                      label={String(t("testimonials.sortOrder"))}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
              <form.AppField name="isVisible">
                {(field) => (
                  <field.BooleanField
                    label={String(t("testimonials.isVisible"))}
                  />
                )}
              </form.AppField>
            </FieldSet>
          </OverlayFormBody>
        </ScrollArea>
        <DialogFooter className="border-t px-6 py-4">
          <OverlayFormFooterActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              <XIcon className="size-3.5" />
              {String(t("common.cancel"))}
            </Button>
            <OverlayFormSubmitButton formId={formId} disabled={pending}>
              {pending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <SaveIcon className="size-3.5" />
              )}
              {pending ? String(t("common.saving")) : String(t("common.save"))}
            </OverlayFormSubmitButton>
          </OverlayFormFooterActions>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
