"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/features/core/auth/core/helpers";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";

export const defaultAvatar = "https://github.com/shadcn.png";

export function UserAvatar() {
  const { session, isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  return (
    <Avatar>
      <AvatarImage
        src={session.user.imageUrl || defaultAvatar}
        alt={session.user.name || "User Name"}
      />
      <AvatarFallback>
        {session.user.name && getInitials(session.user.name)}
      </AvatarFallback>
    </Avatar>
  );
}
