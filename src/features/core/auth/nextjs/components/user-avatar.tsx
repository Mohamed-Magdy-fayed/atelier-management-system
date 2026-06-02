"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/features/core/auth/core/helpers";
import { useAuth } from "@/features/core/auth/nextjs/components/auth-provider";

export const defaultAvatar = "https://github.com/shadcn.png";

export function UserAvatar({
  className,
  fallbackClassName,
}: {
  className?: string;
  fallbackClassName?: string;
} = {}) {
  const { session, isAuthenticated } = useAuth();
  if (!isAuthenticated) return null;

  const displayName = session.user.name?.trim() || session.user.email;

  return (
    <Avatar className={className}>
      <AvatarImage
        src={session.user.imageUrl || defaultAvatar}
        alt={displayName}
      />
      <AvatarFallback className={fallbackClassName}>
        {session.user.name
          ? getInitials(session.user.name)
          : displayName.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
