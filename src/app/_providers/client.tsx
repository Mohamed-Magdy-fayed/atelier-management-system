"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";
import { useTRPC } from "@/integrations/trpc/client";

export function ClientGreeting() {
    const { session } = useAuth();
    const trpc = useTRPC();
    const greeting = useQuery(trpc.hello.queryOptions({ text: session?.user.name || "world" }));
    if (!greeting.data) return <div>Loading...</div>;
    return <div>{greeting.data.greeting}</div>;
}
