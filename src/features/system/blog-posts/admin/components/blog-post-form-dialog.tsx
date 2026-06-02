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
import type { BlogPostRow } from "@/integrations/trpc/routers/blog-posts";

const formSchema = z.object({
  title: z.string().trim().min(1).max(255),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  excerpt: z.string().trim().min(1).max(512),
  content: z.string().trim().min(1),
  authorName: z.string().trim().min(1).max(255),
  coverImageUrl: z.string().max(1024).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

type Props = {
  post?: BlogPostRow | null;
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

export function BlogPostFormDialog({ post, onOpenChange, open }: Props) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const qc = useQueryClient();
  const formId = useId();
  const isEdit = post != null;

  const createMut = useMutation(trpc.blogPosts.create.mutationOptions());
  const updateMut = useMutation(trpc.blogPosts.update.mutationOptions());
  const pending = createMut.isPending || updateMut.isPending;

  const defaultValues = useMemo<FormValues>(
    () => ({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      authorName: "Gateling Solutions",
      coverImageUrl: null,
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
        };
        if (isEdit && post) {
          await toast
            .promise(updateMut.mutateAsync({ id: post.id, ...payload }), {
              loading: String(t("common.saving")),
              success: String(t("blogPosts.postUpdated")),
              error: String(t("blogPosts.postSaveFailed")),
            })
            .unwrap();
        } else {
          await toast
            .promise(createMut.mutateAsync(payload), {
              loading: String(t("common.saving")),
              success: String(t("blogPosts.postCreated")),
              error: String(t("blogPosts.postSaveFailed")),
            })
            .unwrap();
        }
        await qc.invalidateQueries({ queryKey: trpc.blogPosts.pathKey() });
        onOpenChange(false);
      } catch {
        /* surfaced */
      }
    },
  });

  const resetToPost = useCallback(() => {
    if (!post) return;
    form.reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: "",
      authorName: post.authorName,
      coverImageUrl: post.coverImageUrl ?? null,
    });
  }, [post, form]);

  useEffect(() => {
    if (open && isEdit && post) resetToPost();
    else if (open && !isEdit) form.reset(defaultValues);
  }, [open, isEdit, post, resetToPost, form, defaultValues]);

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
            {String(t(isEdit ? "blogPosts.editPost" : "blogPosts.addPost"))}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit
                  ? "blogPosts.editPostDescription"
                  : "blogPosts.addPostDescription",
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
                        {String(t("blogPosts.postTitle"))}
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
                        placeholder={String(
                          t("blogPosts.postTitlePlaceholder"),
                        )}
                      />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="slug">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {String(t("blogPosts.slug"))}
                      </FieldLabel>
                      <Input
                        id={field.name}
                        value={field.state.value as string}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder={String(t("blogPosts.slugPlaceholder"))}
                        className="font-mono text-sm"
                      />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
              <form.AppField name="excerpt">
                {(field) => (
                  <field.TextareaField
                    label={String(t("blogPosts.excerpt"))}
                    placeholder={String(t("blogPosts.excerptPlaceholder"))}
                    rows={3}
                  />
                )}
              </form.AppField>
              <form.AppField name="content">
                {(field) => (
                  <field.TextareaField
                    label={String(t("blogPosts.content"))}
                    placeholder={String(t("blogPosts.contentPlaceholder"))}
                    rows={8}
                  />
                )}
              </form.AppField>
              <FieldGroup>
                <form.AppField name="authorName">
                  {(field) => (
                    <field.StringField
                      label={String(t("blogPosts.author"))}
                      placeholder={String(t("blogPosts.authorPlaceholder"))}
                    />
                  )}
                </form.AppField>
                <form.Field name="coverImageUrl">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        {String(t("blogPosts.coverImage"))}
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
