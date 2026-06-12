"use client";

import React from "react";
import { NotesProvider } from "@/app/_contexts/notes-context";
import { WeaveEngineProvider } from "@/app/_contexts/weave-engine-context";

// Home page uses recent notes and weave engine dashboard
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <WeaveEngineProvider>{children}</WeaveEngineProvider>;
}
