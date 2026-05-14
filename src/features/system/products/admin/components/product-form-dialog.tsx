"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, SaveIcon, XIcon } from "lucide-react";
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
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/features/core/i18n/client";
import { useTRPC } from "@/integrations/trpc/client";
import type { ProductGridRow } from "@/integrations/trpc/routers/products";

const productFormSchema = z.object({
  code: z.string().trim().min(1).max(32),
  nameEn: z.string().trim().min(1).max(128),
  nameAr: z.string().trim().min(1).max(128),
  price: z.number().int().min(0).max(10_000_000),
  isActive: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductFormDialogProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  product?: ProductGridRow | null;
};

export function ProductFormDialog({
  onOpenChange,
  open,
  product,
}: ProductFormDialogProps) {
  const { t } = useTranslation();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const isEdit = product != null;

  const createMut = useMutation(trpc.products.create.mutationOptions());
  const updateMut = useMutation(trpc.products.update.mutationOptions());

  const defaultValues = useMemo<ProductFormValues>(
    () => ({
      code: product?.code ?? "",
      nameEn: product?.nameEn ?? "",
      nameAr: product?.nameAr ?? "",
      price: product?.price ?? 0,
      isActive: product?.isActive ?? true,
    }),
    [product],
  );

  const form = useAppForm({
    defaultValues,
    validators: { onSubmit: productFormSchema },
    onSubmit: async ({ value }) => {
      const action: Promise<unknown> =
        isEdit && product
          ? updateMut.mutateAsync({ id: product.id, ...value })
          : createMut.mutateAsync(value);

      try {
        await toast
          .promise(action, {
            loading: String(t("common.saving")),
            success: String(
              t(
                isEdit
                  ? "systemPages.productUpdated"
                  : "systemPages.productCreated",
              ),
            ),
            error: (err) =>
              err instanceof Error
                ? err.message
                : String(t("systemPages.productSaveFailed")),
          })
          .unwrap();
        await queryClient.invalidateQueries({
          queryKey: trpc.products.pathKey(),
        });
        onOpenChange(false);
      } catch {
        // toast.promise already surfaced the failure.
      }
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const pending = createMut.isPending || updateMut.isPending;
  const SubmitIcon = pending ? Loader2Icon : isEdit ? SaveIcon : PlusIcon;
  const formId = useId();

  const handleBodySubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void form.handleSubmit();
    },
    [form],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-4 pt-4">
          <DialogTitle>
            {String(
              t(isEdit ? "systemPages.editProduct" : "systemPages.addProduct"),
            )}
          </DialogTitle>
          <DialogDescription>
            {String(
              t(
                isEdit
                  ? "systemPages.editProductDescription"
                  : "systemPages.addProductDescription",
              ),
            )}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 py-4" scrollX={false}>
          <OverlayFormBody
            formId={formId}
            className="space-y-4"
            onSubmit={handleBodySubmit}
          >
            <FieldSet disabled={pending}>
              <FieldGroup>
                <form.AppField name="code">
                  {(field) => (
                    <field.StringField
                      label={String(t("systemPages.productsCode"))}
                      placeholder={String(
                        t("systemPages.productsCodePlaceholder"),
                      )}
                      autoFocus
                    />
                  )}
                </form.AppField>
                <form.AppField name="nameEn">
                  {(field) => (
                    <field.StringField
                      label={String(t("systemPages.productsNameEn"))}
                      placeholder={String(
                        t("systemPages.productsNameEnPlaceholder"),
                      )}
                    />
                  )}
                </form.AppField>
                <form.AppField name="nameAr">
                  {(field) => (
                    <field.StringField
                      label={String(t("systemPages.productsNameAr"))}
                      placeholder={String(
                        t("systemPages.productsNameArPlaceholder"),
                      )}
                    />
                  )}
                </form.AppField>
                <form.AppField name="price">
                  {(field) => (
                    <field.NumberField
                      label={String(t("systemPages.productsPrice"))}
                      placeholder={String(
                        t("systemPages.productsPricePlaceholder"),
                      )}
                    />
                  )}
                </form.AppField>
                <form.AppField name="isActive">
                  {(field) => (
                    <field.BooleanField
                      label={String(t("systemPages.productsActiveLabel"))}
                      description={String(
                        t("systemPages.productsActiveDescription"),
                      )}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
            </FieldSet>
          </OverlayFormBody>
        </ScrollArea>
        <DialogFooter className="shrink-0 border-t bg-muted px-4 py-4 sm:flex-row sm:justify-end">
          <OverlayFormFooterActions>
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              <XIcon className="size-3.5" />
              {String(t("common.cancel"))}
            </Button>
            <OverlayFormSubmitButton
              formId={formId}
              size="default"
              disabled={pending}
            >
              <SubmitIcon
                className={pending ? "size-3.5 animate-spin" : "size-3.5"}
              />
              {pending
                ? String(t("common.saving"))
                : isEdit
                  ? String(t("common.save"))
                  : String(t("common.create"))}
            </OverlayFormSubmitButton>
          </OverlayFormFooterActions>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
