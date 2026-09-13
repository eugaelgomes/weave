"use client";

import { AgentProvider } from "@/app/_contexts/agent-context";

export default function AgentsLayout({ children }: { children: React.ReactNode }) {
  return <AgentProvider>{children}</AgentProvider>;
}
