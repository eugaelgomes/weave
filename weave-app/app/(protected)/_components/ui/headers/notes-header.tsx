"use client";

import React from "react";
import { useLanguage } from "@/app/_contexts/language-context";
import { BaseHeader } from "./base-header";
import { AnimatedGreeting } from "./animated-greeting";

export function NotesHeader() {
  return <BaseHeader leftContent={<AnimatedGreeting type="notes" />} />;
}
