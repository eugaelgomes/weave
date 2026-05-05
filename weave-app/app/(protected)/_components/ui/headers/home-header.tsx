"use client";

import React from "react";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

export function HomeHeader() {
  return (
    <BaseHeader
      leftContent={<AnimatedGreeting type="home" />}
    />
  );
}
