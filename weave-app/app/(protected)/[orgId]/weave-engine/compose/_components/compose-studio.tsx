"use client";

import React from "react";
import { useSearchParams } from "next/navigation";

import { ComposeConversation } from "@/app/(protected)/[orgId]/weave-engine/compose/_components/compose-conversation";
import { ComposeWorkspace } from "@/app/(protected)/[orgId]/weave-engine/compose/_components/compose-workspace";
import { useComposeSession } from "@/app/(protected)/[orgId]/weave-engine/compose/_hooks/use-compose-session";

export function ComposeStudio() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("projectId");
  const from = searchParams.get("from");
  const initialIntent = searchParams.get("intent");

  const session = useComposeSession(initialProjectId, from, initialIntent);

  if (!session.canManage) {
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 pb-4">
      <ComposeConversation
        messages={session.messages}
        backHref={session.backHref}
        chatLoading={session.chatLoading}
        onChip={session.handleChip}
        onSend={session.sendUserMessage}
      />
      <ComposeWorkspace
        intent={session.intent}
        projectId={session.projectId}
        onProjectIdChange={session.setProjectId}
      />
    </div>
  );
}
