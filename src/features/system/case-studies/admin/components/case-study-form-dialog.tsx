"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { CaseStudyRow } from "@/integrations/trpc/routers/case-studies";

const formSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  client: z.string().trim().min(1).max(255),
  industry: z.string().trim().min(1).max(128),
  problemStatement: z.string().trim().min(1).max(4000),
  solution: z.string().trim().min(1).max(4000),
  resultsSummary: z.string().trim().min(1).max(512),
  resultsMetrics: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .min(1),
  coverImageUrl: z.string().max(1024).optional().nullable(),
  liveUrl: z.string().max(1024).optional().nullable(),
  sortOrder: z.number().int().min(0),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  caseStudy?: CaseStudyRow | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export function CaseStudyFormDialog({ caseStudy, onOpenChange, open }: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const formId = useId();
  const isEdit = caseStudy != null;

  const existingQuery = useQuery({
    ...trpc.caseStudies.getById.queryOptions({ id: caseStudy?.id ?? "" }),
    enabled: open && isEdit && Boolean(caseStudy?.id),
  });
  const detail = existingQuery.data;

  const createMut = useMutation(trpc.caseStudies.create.mutationOptions());
  const updateMut = useMutation(trpc.caseStudies.update.mutationOptions());
  const pending = createMut.isPending || updateMut.isPending;

  const defaultValues = useMemo<FormValues>(
    () => ({
      title: "",
      slug: "",
      client: "",
      industry: "",
      problemStatement: "",
      solution: "",
      resultsSummary: "",
      resultsMetrics: [{ label: "", value: "" }],
      coverImageUrl: null,
      liveUrl: null,
      sortOrder: 0,
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
          coverImageUrl: value.coverImageUrl || null,
          liveUrl: value.liveUrl || null,
          results: {
            summary: value.resultsSummary,
            metrics: value.resultsMetrics,
          },
        };
        if (isEdit && caseStudy) {
          await toast
            .promise(updateMut.mutateAsync({ id: caseStudy.id, ...payload }), {
              loading: String(t("common.saving")),
              success: String(t("work.workUpdated")),
              error: String(t("work.workSaveFailed")),
            })
            .unwrap();
        } else {
          await toast
            .promise(createMut.mutateAsync(payload), {
              loading: String(t("common.saving")),
              success: String(t("work.workCreated")),
              error: String(t("work.workSaveFailed")),
            })
            .unwrap();
        }
        await qc.invalidateQueries({ queryKey: trpc.caseStudies.pathKey() });
        onOpenChange(false);
      } catch {
        /* surfaced by toast */
      }
    },
  });

  const resetToDetail = useCallback(() => {
    if (!detail) return;
    form.reset({
      title: detail.title,
      slug: detail.slug,
      client: detail.client,
      industry: detail.industry,
      problemStatement: detail.problemStatement,
      solution: detail.solution,
      resultsSummary: detail.results.summary,
      resultsMetrics:
        detail.results.metrics.length > 0
          ? detail.results.metrics
          : [{ label: "", value: "" }],
      coverImageUrl: detail.coverImageUrl ?? null,
      liveUrl: detail.liveUrl ?? null,
      sortOrder: detail.sortOrder,
    });
  }, [detail, form]);

  useEffect(() => {
    if (open && isEdit && detail) resetToDetail();
    else if (open && !isEdit) form.reset(defaultValues);
  }, [open, isEdit, detail, resetToDetail, form, defaultValues]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    void form.handleSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>
            {String(t(isEdit ? "work.editWork" : "work.addWork"))}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit ? "work.editWorkDescription" : "work.addWorkDescription",
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
                <form.Field name="title">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {String(t("work.name"))}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        value={field.state.value as string}
                        onChange={(e) => {
                          field.handleChange(e.target.value);
                          if (!isEdit)
                            form.setFieldValue("slug", slugify(e.target.value));
                        }}
                        onBlur={field.handleBlur}
                        placeholder={String(t("work.namePlaceholder"))}
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="slug">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {String(t("work.slug"))}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        value={field.state.value as string}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder={String(t("work.slugPlaceholder"))}
                        className="font-mono text-sm"
                      />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
              <FieldGroup>
                <form.AppField name="client">
                  {(field) => (
                    <field.StringField
                      label={String(t("work.client"))}
                      placeholder={String(t("work.clientPlaceholder"))}
                    />
                  )}
                </form.AppField>
                <form.AppField name="industry">
                  {(field) => (
                    <field.StringField
                      label={String(t("work.industry"))}
                      placeholder={String(t("work.industryPlaceholder"))}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
              <form.AppField name="problemStatement">
                {(field) => (
                  <field.TextareaField
                    label={String(t("work.problem"))}
                    placeholder={String(t("work.problemPlaceholder"))}
                    rows={4}
                  />
                )}
              </form.AppField>
              <form.AppField name="solution">
                {(field) => (
                  <field.TextareaField
                    label={String(t("work.solution"))}
                    placeholder={String(t("work.solutionPlaceholder"))}
                    rows={4}
                  />
                )}
              </form.AppField>

              <Separator />

              {/* Results metrics */}
              <form.Field name="resultsMetrics" mode="array">
                {(field) => (
                  <Field>
                    <FieldLabel>{String(t("work.results"))}</FieldLabel>
                    <div className="space-y-2">
                      {field.state.value.map((_, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: TanStack Form array fields have no stable ID
                        <div key={index} className="flex gap-2">
                          <form.Field name={`resultsMetrics[${index}].label`}>
                            {(subField) => (
                              <Input
                                value={subField.state.value as string}
                                onChange={(e) =>
                                  subField.handleChange(e.target.value)
                                }
                                placeholder={String(
                                  t("work.resultsMetricLabelPlaceholder"),
                                )}
                                className="flex-1"
                              />
                            )}
                          </form.Field>
                          <form.Field name={`resultsMetrics[${index}].value`}>
                            {(subField) => (
                              <Input
                                value={subField.state.value as string}
                                onChange={(e) =>
                                  subField.handleChange(e.target.value)
                                }
                                placeholder={String(
                                  t("work.resultsMetricValuePlaceholder"),
                                )}
                                className="w-28"
                              />
                            )}
                          </form.Field>
                          {field.state.value.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => field.removeValue(index)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          field.pushValue({ label: "", value: "" })
                        }
                      >
                        <PlusIcon className="me-1 size-3.5" />
                        {String(t("work.addMetric"))}
                      </Button>
                    </div>
                  </Field>
                )}
              </form.Field>

              <form.AppField name="resultsSummary">
                {(field) => (
                  <field.TextareaField
                    label={String(t("work.resultsSummary"))}
                    placeholder={String(t("work.resultsSummaryPlaceholder"))}
                    rows={2}
                  />
                )}
              </form.AppField>

              <Separator />

              <FieldGroup>
                <form.Field name="coverImageUrl">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {String(t("work.coverImage"))}
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
                <form.Field name="liveUrl">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>Live App URL</FieldLabel>
                      <Input
                        id={field.name}
                        value={(field.state.value as string) ?? ""}
                        onChange={(e) =>
                          field.handleChange(e.target.value || null)
                        }
                        onBlur={field.handleBlur}
                        placeholder="https://myapp.gateling.com/"
                      />
                    </Field>
                  )}
                </form.Field>
                <form.AppField name="sortOrder">
                  {(field) => (
                    <field.NumberField label={String(t("work.sortOrder"))} />
                  )}
                </form.AppField>
              </FieldGroup>
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
