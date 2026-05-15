import { cn } from "@/lib/utils";

/** Keeps public tab pages at least full viewport height above the mobile tab bar. */
export function PublicPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100dvh-3.5rem-4rem-env(safe-area-inset-bottom))] flex-col md:min-h-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
