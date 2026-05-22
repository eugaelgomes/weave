const CHAT_SESSION_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns true if the value looks like a server chat session UUID (ai_chat_sessions.id).
 * Used to avoid treating route slugs such as "history" (from /weave-ai/chat/history) as session ids.
 */
export function isChatSessionId(value: unknown): value is string {
  return typeof value === "string" && CHAT_SESSION_UUID_RE.test(value.trim());
}
