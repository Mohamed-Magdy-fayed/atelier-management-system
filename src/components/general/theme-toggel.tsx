"use client";

import { Loader, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Swap, SwapOff, SwapOn } from "@/components/ui/swap";

export function ThemeToggle() {
    const [isMounted, setIsMounted] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted)
        return (
            <div className={buttonVariants({ variant: "ghost", size: "icon" })}>
                <Spinner />
            </div>
        );

    return (
        <Swap
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            animation="rotate"
            onSwappedChange={(val) => setTheme(val ? "dark" : "light")}
            swapped={resolvedTheme === "dark"}
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
