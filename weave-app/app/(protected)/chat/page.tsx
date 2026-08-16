"use client";

import { useAuth } from "@/app/_contexts/auth-context";
import { ChatViewClient } from "@/app/_components/weave-ai/chat/chat-view-client";

export default function HomePage() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!authenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/auth/";
    }
    return null;
  }

  return <ChatViewClient />;
}
