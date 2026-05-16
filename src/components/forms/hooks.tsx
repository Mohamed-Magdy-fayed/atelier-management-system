import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { toast } from "sonner";

import { FormImageField } from "@/components/forms/image-field";
import { useTranslation } from "@/features/core/i18n/client";
import { translateFormErrorMessage } from "@/components/forms/validation-messages";
import { FormBooleanField } from "./boolean-field";
import { FormComboboxOneField } from "./combobox-one-field";
import { FormDateField } from "./date-field";
import { FormDateTimeField } from "./date-time-field";
import { FormEmailField } from "./email-field";
import { FormMobileField } from "./mobile-field";
import { FormNumberField } from "./number-field";
import { FormPasswordField } from "./password-field";
// import { FormSearchLookupField } from "./search-lookup-field";
import { FormSelectField } from "./select-field";
import { FormStringField } from "./string-field";
import { FormTextareaField } from "./textarea-field";

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

const { useAppForm: useAppFormBase } = createFormHook({
  fieldComponents: {
    StringField: FormStringField,
    NumberField: FormNumberField,
    EmailField: FormEmailField,
    PasswordField: FormPasswordField,
    MobileField: FormMobileField,
    ComboboxOneField: FormComboboxOneField,
    SelectField: FormSelectField,
    DateField: FormDateField,
    DateTimeField: FormDateTimeField,
    BooleanField: FormBooleanField,
    TextareaField: FormTextareaField,
    ImageField: FormImageField,
    // SearchLookupField: FormSearchLookupField,
  },
  formComponents: {},
  fieldContext,
  formContext,
});

const useAppForm: typeof useAppFormBase = (opts) => {
  const { t } = useTranslation();

  return useAppFormBase({
    ...opts,
    onSubmitInvalid: (props) => {
      opts.onSubmitInvalid?.(props);
      const errors = Object.values(props.formApi.state.fieldMeta)
        .flatMap((meta) => {
          const fieldMeta = meta as { errors?: unknown[] } | undefined;
          return fieldMeta?.errors ?? [];
        })
        .filter(Boolean);
      if (errors.length > 0) {
        const message = errors
          .map((e) => {
            const raw =
              typeof e === "string" ? e : (e as { message?: string })?.message;
            return raw
              ? translateFormErrorMessage((key) => String(t(key as never)), raw)
              : undefined;
          })
          .filter(Boolean)
          .join("\n");
        if (message) toast.error(message);
      }
    },
  });
};

export { useAppForm, useFieldContext, useFormContext };
