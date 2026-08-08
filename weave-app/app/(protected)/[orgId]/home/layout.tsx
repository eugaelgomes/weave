"use client";

import React from "react";
import { NotesProvider } from "@/app/_contexts/notes-context";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
