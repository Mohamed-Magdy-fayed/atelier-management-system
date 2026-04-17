"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { buttonVariants } from "@/components/ui/button";
import { Swap, SwapOff, SwapOn } from "@/components/ui/swap";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <Swap
            className={buttonVariants({ variant: "ghost", size: "icon" })}
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
