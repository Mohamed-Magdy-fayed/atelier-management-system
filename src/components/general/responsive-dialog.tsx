import type { PropsWithChildren } from "react";

import {
    ResponsiveDialog as BaseResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    ResponsiveDialogTrigger,
} from "@/components/ui/responsive-dialog";

export function ResponsiveDialog({ children, onOpenChange, open }: PropsWithChildren<{
    onOpenChange: (open: boolean) => void;
    open: boolean;
}>) {
    return (
        <BaseResponsiveDialog open={open} onOpenChange={onOpenChange}>
            <ResponsiveDialogTrigger />
            <ResponsiveDialogContent>
                <ResponsiveDialogHeader>
                    <ResponsiveDialogTitle />
                    <ResponsiveDialogDescription />
                </ResponsiveDialogHeader>
                {children}
                <ResponsiveDialogFooter />
            </ResponsiveDialogContent>
        </BaseResponsiveDialog>
    );
}
