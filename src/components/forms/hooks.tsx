import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { toast } from "sonner";

import { FormImageField } from "@/components/forms/image-field";
import { useTranslation } from "@/features/core/i18n/client";
import { FormBooleanField } from "./boolean-field";
import { FormDateField } from "./date-field";
import { FormEmailField } from "./email-field";
import { FormMobileField } from "./mobile-field";
import { FormNumberField } from "./number-field";
import { FormPasswordField } from "./password-field";
// import { FormSearchLookupField } from "./search-lookup-field";
import { FormSelectField } from "./select-field";
import { FormStringField } from "./string-field";

const { fieldContext, formContext, useFieldContext, useFormContext } =
    createFormHookContexts();

const { useAppForm: useAppFormBase } = createFormHook({
    fieldComponents: {
        StringField: FormStringField,
        NumberField: FormNumberField,
        EmailField: FormEmailField,
        PasswordField: FormPasswordField,
        MobileField: FormMobileField,
        SelectField: FormSelectField,
        DateField: FormDateField,
        BooleanField: FormBooleanField,
        ImageField: FormImageField,
        // SearchLookupField: FormSearchLookupField,
    },
    formComponents: {},
    fieldContext,
    formContext,
});

const useAppForm = ((...args: Parameters<typeof useAppFormBase>) => {
    const { t } = useTranslation();
    const [opts, ...rest] = args;
    return useAppFormBase(
        {
            ...opts,
            onSubmitInvalid: (props) => {
                opts.onSubmitInvalid?.(props);
                const errors = Object.values(props.formApi.state.fieldMeta)
                    .flatMap((meta) => meta?.errors ?? [])
                    .filter(Boolean);
                if (errors.length > 0) {
                    const message = errors
                        .map((e) => {
                            const raw =
                                typeof e === "string"
                                    ? e
                                    : (e as { message?: string })?.message;
                            return raw ? t(raw as any) : undefined;
                        })
                        .filter(Boolean)
                        .join("\n");
                    if (message) toast.error(message);
                }
            },
        },
        ...rest,
    );
}) as typeof useAppFormBase;

export { useAppForm, useFieldContext, useFormContext };
