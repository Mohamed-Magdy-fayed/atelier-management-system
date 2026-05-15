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
      className={cn("relative overflow-auto scrollbar-thin scrollbar-thumb-primary scrollbar-gutter-auto", className)}
      {...props}
    >
        {children}
    </div>
  );
}

export { ScrollArea };
