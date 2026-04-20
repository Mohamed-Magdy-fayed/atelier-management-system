import { ArrowLeftIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { LinkButton } from "@/components/general/link-button";

export function BackLink({
    href,
    text,
    ...props
}: { href: string; text?: string } & ComponentProps<typeof LinkButton>) {
    return (
        <LinkButton
            {...props}
            href={href}
        >
            <ArrowLeftIcon className="rtl:rotate-180" />
            {text}
        </LinkButton>
    );
}
