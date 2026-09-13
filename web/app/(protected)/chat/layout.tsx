"use client";

import React from "react";
import { AgentProvider } from "@/app/_contexts/agent-context";
import { ChatProvider } from "@/app/_contexts/chat-context";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <AgentProvider>
      <ChatProvider>{children}</ChatProvider>
    </AgentProvider>
  );
}
