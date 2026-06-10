"use client";

import { Moon, Sun } from "lucide-react";
import {
  createContext,
  type PropsWithChildren,
  startTransition,
  use,
} from "react";

import { buttonVariants } from "@/components/ui/button";
import { Swap, SwapOff, SwapOn } from "@/components/ui/swap";
import { setThemeCookie, type Theme } from "@/features/core/color-theme/server";
import { cn } from "@/lib/utils";

type ThemeContextVal = { theme: Theme; setTheme: (data: Theme) => void };
type Props = PropsWithChildren<{ theme: Theme }>;

const ThemeContext = createContext<ThemeContextVal | null>(null);

export function ThemeProvider({ children, theme }: Props) {
  function setTheme(val: Theme) {
    document.documentElement.classList.toggle("dark");
    startTransition(() => {
      setThemeCookie(val);
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const val = use(ThemeContext);
  if (!val) throw new Error("useTheme called outside of ThemeProvider!");
  return val;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <Swap
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        className,
      )}
      animation="rotate"
      onSwappedChange={(val) => setTheme(val ? "dark" : "light")}
      swapped={theme === "dark"}
    >
      <SwapOn>
        <Moon />
      </SwapOn>
      <SwapOff>
        <Sun />
      </SwapOff>
    </Swap>
  );
}
