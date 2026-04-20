import type { ReactElement, ReactNode } from "react";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function WrapWithTooltip({
    children,
    text,
}: {
    children: ReactElement;
    text: string | ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger render={children} />
            <TooltipContent>{text}</TooltipContent>
        </Tooltip>
    );
}
