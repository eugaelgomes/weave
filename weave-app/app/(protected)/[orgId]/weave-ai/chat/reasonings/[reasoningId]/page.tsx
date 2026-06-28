"use client";

import React, { useRef } from "react";
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
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
  const [activeArtifactId, setActiveArtifactId] = React.useState<string | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSandboxOpen = searchParams.get("sandbox") === "1";

  const toggleSandbox = (artifactId?: string) => {
    if (artifactId) {
      setActiveArtifactId(artifactId);
    }

    const params = new URLSearchParams(searchParams.toString());
    if (isSandboxOpen) {
      params.delete("sandbox");
    } else {
      params.set("sandbox", "1");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openSandboxForArtifact = (artifactId?: string) => {
    if (artifactId) {
      setActiveArtifactId(artifactId);
    }

    if (!isSandboxOpen) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sandbox", "1");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

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
            isSandboxOpen ? "w-3/5" : "w-full"
          )}
        >
          <ChatInterface
            variant="engine"
            chatId={chatId}
            onToggleSandbox={toggleSandbox}
            onOpenSandbox={openSandboxForArtifact}
            isSandboxOpen={isSandboxOpen}
          />
        </div>

        {/* Right Pane: Sandbox */}
        <div
          className={cn(
            "h-full flex-shrink-0 transition-all duration-300 ease-in-out",
            isSandboxOpen
              ? "w-2/5 translate-x-0 opacity-100"
              : "w-0 translate-x-[100%] overflow-hidden opacity-0"
          )}
        >
          {isSandboxOpen && (
            <ReasoningSandbox
              reasoningId={reasoningId}
              artifactId={activeArtifactId || undefined}
              onDraftChange={handleDraftChange}
            />
          )}
        </div>
      </div>
    </ChatProvider>
  );
}
