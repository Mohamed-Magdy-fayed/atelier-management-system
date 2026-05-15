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
  actions?: ReactElement | null;
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
      {triggerRender ? <DialogTrigger render={triggerRender} /> : null}
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
        <DialogHeader className="shrink-0 bg-input gap-0 rounded-lg p-4">
          <DialogTitle render={titleRender} className="px-4 py-2" />
          <DialogDescription render={descriptionRender} className="px-4 py-2" />
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4">{children}</ScrollArea>

        {actions ? (
          <div className="shrink-0 border-t bg-muted px-4 py-4">{actions}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
