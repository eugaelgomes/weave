import { redirect } from "next/navigation";
import ChatInterface from "@/app/(protected)/[orgId]/weave-ai/_components/chat-interface";
import { isChatSessionId } from "@/app/_utils/chat-session-id";

export default async function ChatHistoryPage({
  params,
}: {
  params: Promise<{ id: string; orgId: string }>;
}) {
  const resolvedParams = await params;
  const id = String(resolvedParams.id || "").trim();
  const orgId = resolvedParams.orgId;

  if (!isChatSessionId(id)) {
    redirect(`/${orgId}/weave-ai/chat`);
  }

  return <ChatInterface chatId={id} />;
}
