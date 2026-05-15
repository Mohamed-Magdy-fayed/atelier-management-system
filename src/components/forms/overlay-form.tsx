"use client";

import type { ComponentProps, FormEventHandler, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OverlayFormBodyProps = Omit<
  ComponentProps<"form">,
  "id" | "onSubmit"
> & {
  formId: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function OverlayFormBody({
  formId,
  onSubmit,
  className,
  ...props
}: OverlayFormBodyProps) {
  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className={cn(className)}
      {...props}
    />
  );
}

export type OverlayFormSubmitButtonProps = ComponentProps<typeof Button> & {
  formId: string;
};

export function OverlayFormSubmitButton({
  formId,
  className,
  ...props
}: OverlayFormSubmitButtonProps) {
  return (
    <Button
      type="submit"
      form={formId}
      className={cn("flex-1", className)}
      {...props}
    />
  );
}

export function OverlayFormFooterActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2 justify-end", className)}>{children}</div>
  );
}
