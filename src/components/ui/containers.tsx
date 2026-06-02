import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

// ─── Section ─────────────────────────────────────────────────────────────────
// Wraps a page section with standardized vertical padding and optional bg.

type SectionVariant = "default" | "muted" | "primary" | "compact";

const sectionVariants: Record<SectionVariant, string> = {
  default: "py-20",
  compact: "py-12",
  muted: "bg-muted/30 py-20",
  primary: "bg-primary text-primary-foreground py-24",
};

export function Section({
  variant = "default",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { variant?: SectionVariant }) {
  return (
    <section className={cn(sectionVariants[variant], className)} {...props}>
      {children}
    </section>
  );
}

// ─── Container ───────────────────────────────────────────────────────────────
// Centered, max-width constrained, horizontally padded container.

type ContainerSize = "default" | "narrow" | "wide";

const containerSizes: Record<ContainerSize, string> = {
  default: "max-w-6xl",
  narrow: "max-w-3xl",
  wide: "max-w-7xl",
};

export function Container({
  size = "default",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { size?: ContainerSize }) {
  return (
    <div
      className={cn(
        "container mx-auto px-4 md:px-8",
        containerSizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
// Centered section intro: optional eyebrow label + heading + subheading.

export function SectionHeader({
  eyebrow,
  heading,
  subheading,
  align = "center",
  className,
}: {
  eyebrow?: React.ReactNode;
  heading: React.ReactNode;
  subheading?: React.ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div
      className={cn("mb-12", align === "center" && "text-center", className)}
    >
      {eyebrow && (
        <p className="text-primary mb-3 text-sm font-semibold uppercase tracking-widest">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
        {heading}
      </h2>
      {subheading && (
        <p
          className={cn(
            "text-muted-foreground mt-3 text-lg",
            align === "center" && "mx-auto max-w-2xl",
          )}
        >
          {subheading}
        </p>
      )}
    </div>
  );
}

// ─── HeroContainer ─────────────────────────────────────────────────────────────
// Full-width hero with gradient backdrop + subtle dot grid pattern.

export function HeroContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("relative overflow-hidden py-24 md:py-36", className)}
      {...props}
    >
      {/* gradient backdrop */}
      <div className="from-primary/8 via-background to-background pointer-events-none absolute inset-0 bg-linear-to-b" />
      {/* subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative">{children}</div>
    </section>
  );
}

// ─── Grid ────────────────────────────────────────────────────────────────────
// Reusable responsive grid.

type GridCols = 2 | 3 | 4;

const gridColsClasses: Record<GridCols, string> = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
};

export function Grid({
  cols = 3,
  gap = "default",
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  cols?: GridCols;
  gap?: "default" | "compact";
}) {
  return (
    <div
      className={cn(
        "grid",
        gridColsClasses[cols],
        gap === "compact" ? "gap-4" : "gap-6 md:gap-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── ContentCard ─────────────────────────────────────────────────────────────
// Simple content card with consistent shadow + border treatment.

export function ContentCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-background rounded-xl border p-6 shadow-sm",
        "ring-primary/0 transition-all duration-200 hover:shadow-md hover:ring-1 hover:ring-primary/20",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── GradientText ─────────────────────────────────────────────────────────────
// Inline gradient text highlight for headings.

export function GradientText({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

// ─── Stat ─────────────────────────────────────────────────────────────────────
// A single metric/stat display for the hero stats row.

export function Stat({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <p className="text-primary text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-sm">{label}</p>
    </div>
  );
}
