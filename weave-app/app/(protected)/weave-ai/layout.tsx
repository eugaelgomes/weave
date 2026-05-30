"use client";

import React from "react";
import { ChatProvider } from "@/app/_contexts/chat-context";
import { AgentProvider } from "@/app/_contexts/agent-context";
import { NotesProvider } from "@/app/_contexts/notes-context";

// Providers scoped to all /weave-ai/* routes (chat + agent)
export default function WeaveAiLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotesProvider>
      <ChatProvider>
        <AgentProvider>{children}</AgentProvider>
      </ChatProvider>
    </NotesProvider>
  );
}
