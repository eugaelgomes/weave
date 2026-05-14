import { redirect } from "next/navigation";
import ChatInterface from "../_components/chat-interface";
import { isChatSessionId } from "@/app/_utils/chat-session-id";

export default async function ChatHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = String(resolvedParams.id || "").trim();

  if (!isChatSessionId(id)) {
    redirect("/weave-ai/chat");
  }

  return <ChatInterface chatId={id} />;
}
