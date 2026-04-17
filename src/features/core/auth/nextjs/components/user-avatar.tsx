"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";

export function UserAvatar() {
    const { session, isAuthenticated } = useAuth();
    if (!isAuthenticated) return null

    return (
        <Avatar>
            <AvatarImage src={session.user.imageUrl || "https://github.com/shadcn.png"} alt={session.user.name || "User Name"} />
            <AvatarFallback>CN</AvatarFallback>
        </Avatar>
    );
}