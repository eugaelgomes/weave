import ChatInterface from "../_components/chat-interface";

export default async function ChatHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  return <ChatInterface chatId={resolvedParams.id} />;
}
