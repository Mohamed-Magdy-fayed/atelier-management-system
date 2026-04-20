"use client";

import { MailIcon } from "lucide-react";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { FormBase, type FormFieldProps } from "./form-base";
import { useFieldContext } from "./hooks";

export function FormEmailField({
    placeholder,
    autoFocus,
    ...props
}: FormFieldProps & { placeholder?: string }) {
    const field = useFieldContext<string>();
    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

    return (
        <FormBase {...props}>
            <InputGroup>
                <InputGroupAddon align="inline-end">
                    <MailIcon />
                </InputGroupAddon>
                <Separator orientation="vertical" />
                <InputGroupInput
                    aria-invalid={isInvalid}
                    autoComplete="off"
                    autoFocus={autoFocus}
                    id={field.name}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder={placeholder}
                    type="email"
                    value={field.state.value}
                />
            </InputGroup>
        </FormBase>
    );
}
