"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import ChatInterface from "./chat-interface";
import { ArtifactSandbox } from "../sandbox/artifact-sandbox";

export function ChatViewClient({ chatId }: { chatId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [isSandboxOpen, setIsSandboxOpen] = useState(
    searchParams.get("sandbox") === "1"
  );
  
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(
    searchParams.get("artifactId") || null
  );

  // Sync state with URL search params (e.g. back navigation or initial load)
  useEffect(() => {
    setIsSandboxOpen(searchParams.get("sandbox") === "1");
    if (searchParams.get("artifactId")) {
      setActiveArtifactId(searchParams.get("artifactId"));
    }
  }, [searchParams]);

  const toggleSandbox = (artifactId?: string) => {
    if (artifactId) setActiveArtifactId(artifactId);

    const nextOpen = !isSandboxOpen;
    setIsSandboxOpen(nextOpen);

    const params = new URLSearchParams(searchParams.toString());
    if (nextOpen) {
      params.set("sandbox", "1");
      if (artifactId) params.set("artifactId", artifactId);
    } else {
      params.delete("sandbox");
      params.delete("artifactId");
    }
    const basePath = pathname.endsWith("/") ? pathname : `${pathname}/`;
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  };

  const openSandboxForArtifact = (artifactId?: string) => {
    if (artifactId) setActiveArtifactId(artifactId);

    setIsSandboxOpen(true);

    const params = new URLSearchParams(searchParams.toString());
    params.set("sandbox", "1");
    if (artifactId) params.set("artifactId", artifactId);
    const basePath = pathname.endsWith("/") ? pathname : `${pathname}/`;
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
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
