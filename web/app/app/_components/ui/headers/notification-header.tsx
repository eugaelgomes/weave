"use client";

import React, { ReactNode } from "react";
// import { useLanguage } from "@/app/_contexts/language-context"; // Commented out to be safe
import { BaseHeader } from "./base-header";
import { Bell } from "lucide-react";

interface NotificationHeaderProps {
  className?: string;
  rightContent?: ReactNode;
  titleSuffix?: ReactNode;
}

export function NotificationHeader({ className, rightContent, titleSuffix }: NotificationHeaderProps) {
  // const { t } = useLanguage();

  return (
    <BaseHeader
      className={className}
      leftContent={
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Notifications
          {titleSuffix}
        </div>
      }
      rightContent={rightContent}
    />
  );
}
