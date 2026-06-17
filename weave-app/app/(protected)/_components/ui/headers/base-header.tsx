"use client";

import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useFormatters } from "@/app/_utils/product-patterns";

interface BaseHeaderProps {
  className?: string;
  leftContent: ReactNode;
  rightContent?: ReactNode;
}

export function BaseHeader({ className, leftContent, rightContent }: BaseHeaderProps) {
  const { dateFormat, timeFormat } = useFormatters();
  const userCurrentDateTime = new Date();

  return null;
}
