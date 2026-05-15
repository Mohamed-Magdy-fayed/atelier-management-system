"use client";

import { cn } from "@/lib/utils";
import { ComponentProps, PropsWithChildren } from "react";

type ScrollAreaProps = PropsWithChildren<ComponentProps<"div">>

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("relative min-h-0 overflow-auto", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { ScrollArea };
