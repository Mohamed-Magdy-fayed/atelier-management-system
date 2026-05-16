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
import { translateFormErrorMessage } from "./validation-messages";

export type FormFieldProps = {
  label: string;
  description?: string;
  autoFocus?: boolean;
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
}: FormBaseProps) {
  const field = useFieldContext();
  const { t } = useTranslation();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  const translateErrorMessage = (message?: string) =>
    translateFormErrorMessage((key) => String(t(key as never)), message);

  const errors = field.state.meta.errors.map((e) => {
    if (typeof e === "string") {
      return { message: translateErrorMessage(e) };
    }

    const message = (e as { message?: string })?.message;
    return { ...(e as object), message: translateErrorMessage(message) };
  });

  const labelElement = (
    <>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {description && <FieldDescription>{description}</FieldDescription>}
    </>
  );

  const errorElement = isInvalid && <FieldError errors={errors} />;

  if (controlFirst) {
    return (
      <Field data-invalid={isInvalid} orientation="horizontal">
        {children}
        <FieldContent>
          {labelElement}
          {errorElement}
        </FieldContent>
      </Field>
    );
  }

  return (
    <Field data-invalid={isInvalid}>
      {labelElement}
      {children}
      {errorElement}
    </Field>
  );
}
