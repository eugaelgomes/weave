"use client";

import React, { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import ChatInterface from "@/app/(protected)/[orgId]/weave-ai/_components/chat-interface";
import { ChatProvider } from "@/app/_contexts/chat-context";
import { ReasoningSandbox } from "../_components/reasoning-sandbox";

export default function ReasoningChatPage() {
  const params = useParams();
  const reasoningId = params.reasoningId as string;
  const isNew = reasoningId === "new";
  const chatId = isNew ? undefined : reasoningId;
  const draftStateRef = useRef<any>({});
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);

  const handleDraftChange = (state: any) => {
    draftStateRef.current = state;
  };

  return (
    <ChatProvider
      defaultUseCase="engine_compose"
      defaultContext={{
        reasoningId: isNew ? undefined : reasoningId,
        draftState: draftStateRef.current,
      }}
    >
      <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
        {/* Left Pane: Chat Interface */}
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out",
            isSandboxOpen ? "w-1/2 border-r border-neutral-200 dark:border-neutral-800" : "w-full"
          )}
        >
          <ChatInterface 
            variant="engine" 
            chatId={chatId} 
            onToggleSandbox={() => setIsSandboxOpen((prev) => !prev)} 
            isSandboxOpen={isSandboxOpen}
          />
        </div>

        {/* Right Pane: Sandbox */}
        <div
          className={cn(
            "h-full transition-all duration-300 ease-in-out flex-shrink-0",
            isSandboxOpen ? "w-1/2 translate-x-0 opacity-100" : "w-0 translate-x-[100%] opacity-0 overflow-hidden"
          )}
        >
          {isSandboxOpen && (
            <ReasoningSandbox
              reasoningId={reasoningId}
              onDraftChange={handleDraftChange}
            />
          )}
        </div>
      </div>
    </ChatProvider>
  );
}
