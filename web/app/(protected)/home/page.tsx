"use client";

import React from "react";
import { AgentProvider } from "@/app/_contexts/agent-context";
import AgentCanvas from "./_components/agent-canvas";

export default function HomePage() {
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AgentProvider>
        <AgentCanvas />
      </AgentProvider>
    </div>
  );
}
