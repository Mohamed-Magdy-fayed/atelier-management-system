"use client";

import type { ReactNode } from "react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { useTranslation } from "@/features/core/i18n/client";
import { useFieldContext } from "./hooks";
import {
  extractValidationErrorMessage,
  flattenValidationErrors,
  translateFormErrorMessage,
} from "./validation-messages";
import { TranslationKey } from "@/features/core/i18n/lib";
import { mainTranslations } from "@/features/core/i18n/global";

export type FormFieldProps = {
  label: string;
  description?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

type FormBaseProps = FormFieldProps & {
  children: ReactNode;
  controlFirst?: boolean;
};

export function FormBase({
  children,
  label,
  description,
  controlFirst,
  disabled,
}: FormBaseProps) {
  const field = useFieldContext();
  const { t, locale } = useTranslation();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const translateErrorMessage = (message?: string) =>
    translateFormErrorMessage((key) => t(key as TranslationKey<typeof mainTranslations>, {}), message, {
      locale,
      fallbackLocale: "en",
    });

  const errors = flattenValidationErrors(field.state.meta.errors)
    .map((entry) => extractValidationErrorMessage(entry))
    .filter((message): message is string => Boolean(message))
    .map((message) => ({ message: translateErrorMessage(message) }));


  const labelElement = (
    <>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
    </>
  );

  const errorElement = isInvalid && <FieldError errors={errors} />;

  if (controlFirst) {
    return (
      <Field
        data-invalid={isInvalid}
        data-disabled={disabled ? "true" : undefined}
        orientation="horizontal"
      >
        {children}
        <FieldContent>
          {labelElement}
          {errorElement}
        </FieldContent>
      </Field>
    );
  }

  return (
    <Field data-invalid={isInvalid} data-disabled={disabled ? "true" : undefined}>
      {labelElement}
      {children}
      {errorElement}
    </Field>
  );
}
