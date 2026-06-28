"use client";

import React, { useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import ChatInterface from "@/app/(protected)/[orgId]/weave-ai/_components/chat-interface";
import { ArtifactSandbox } from "@/app/(protected)/[orgId]/weave-ai/_components/artifact-sandbox";

export function ChatViewClient({ chatId }: { chatId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isSandboxOpen = searchParams.get("sandbox") === "1";
  
  // Optional: keep track of active artifact in the frontend if needed
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(
    searchParams.get("artifactId") || null
  );

  const toggleSandbox = (artifactId?: string) => {
    if (artifactId) setActiveArtifactId(artifactId);

    const params = new URLSearchParams(searchParams.toString());
    if (isSandboxOpen) {
      params.delete("sandbox");
      params.delete("artifactId");
    } else {
      params.set("sandbox", "1");
      if (artifactId) params.set("artifactId", artifactId);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const openSandboxForArtifact = (artifactId?: string) => {
    if (artifactId) setActiveArtifactId(artifactId);

    if (!isSandboxOpen || (artifactId && searchParams.get("artifactId") !== artifactId)) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sandbox", "1");
      if (artifactId) params.set("artifactId", artifactId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Pane: Chat Interface */}
      <div
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          isSandboxOpen ? "w-3/5" : "w-full"
        )}
      >
        <ChatInterface
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
          <ArtifactSandbox
            reasoningId={chatId || "new"}
            artifactId={activeArtifactId || undefined}
          />
        )}
      </div>
    </div>
  );
}
