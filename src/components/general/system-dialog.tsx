import type {
    ComponentRenderFn,
    DialogDescriptionProps,
    DialogTitleState,
    DialogTriggerState,
    HTMLProps,
} from "@base-ui/react";
import type {
    JSXElementConstructor,
    PropsWithChildren,
    ReactElement,
} from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type RenderProp<TState> =
    | ReactElement<unknown, string | JSXElementConstructor<TState>>
    | ComponentRenderFn<HTMLProps, TState>;

type SystemDialogProps = PropsWithChildren<{
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    triggerRender?: RenderProp<DialogTriggerState>;
    titleRender?: RenderProp<DialogTitleState>;
    descriptionRender?: RenderProp<DialogDescriptionProps>;
    actions?: ReactElement;
}>;

export function SystemDialog({
    children,
    isOpen,
    onOpenChange,
    triggerRender,
    titleRender,
    descriptionRender,
    actions,
}: SystemDialogProps) {
    return (


        <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
            <DialogTrigger render={triggerRender} />
            <DialogContent className="overflow-hidden">
                <DialogHeader className="bg-input -m-4 p-4 rounded-lg">
                    <DialogTitle render={titleRender} className="px-4 py-2" />
                    <DialogDescription
                        render={descriptionRender}
                        className="px-4 py-2"
                    />
                </DialogHeader>

                <ScrollArea className="max-h-96 px-4 -mx-4 pt-4">
                    {children}
                </ScrollArea>

                {actions ? (
                    <div className="px-4 -mx-4 pt-4 border-t bg-muted">{actions}</div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
