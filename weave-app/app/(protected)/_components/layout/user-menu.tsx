"use client";

import React from "react";
import Image from "next/image";
import { CircleUserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/app/_contexts/auth-context";

export const UserAvatar = ({ user, size = "sm" }: { user: User; size?: "xs" | "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    xs: "h-[26px] w-[26px]",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <figure
      className={cn(
        sizeClasses[size],
        "relative flex-shrink-0 overflow-hidden rounded-full border border-gray-200/70 bg-gray-100 transition-all duration-300 dark:border-gray-700 dark:bg-gray-800"
      )}
      aria-label={user?.user_name || "User"}
    >
      {user?.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt={user?.user_name || "User"}
          fill
          className="rounded-full object-cover"
          sizes={size === "xs" ? "28px" : size === "sm" ? "32px" : size === "md" ? "40px" : "48px"}
        />
      ) : (
        <CircleUserRound
          className="h-full w-full text-gray-600 dark:text-gray-400"
          strokeWidth={1.5}
        />
      )}
    </figure>
  );
};
