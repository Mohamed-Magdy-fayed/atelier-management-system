"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ToggleGroupProps = ToggleGroupPrimitive.Props &
  Pick<VariantProps<typeof buttonVariants>, "size">;

/**
 * Wrapping chip group. Items are base-ui Toggles styled with the shared
 * button variants so focus rings, sizes and RTL behave like every other control.
 */
function ToggleGroup({ className, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn("flex flex-wrap gap-2", className)}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  size = "default",
  ...props
}: TogglePrimitive.Props & Pick<VariantProps<typeof buttonVariants>, "size">) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        buttonVariants({ variant: "outline", size }),
        "data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary/80",
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
