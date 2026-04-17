import { ThemeProvider } from "next-themes";

import { TRPCReactProvider } from "@/integrations/trpc/client";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <TRPCReactProvider>
            <ThemeProvider attribute="class" defaultTheme="dark">
                {children}
            </ThemeProvider>
        </TRPCReactProvider>
    );
}
