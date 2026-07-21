export function extractText(data: unknown): string {
  if (typeof data === "string") {
    return data.trim();
  }

  const obj = data as Record<string, unknown> | undefined;
  const text =
    obj?.text ||
    obj?.content ||
    (typeof obj?.response === "string" ? obj.response : "");

  return String(text || "").trim();
}

export function safeJsonParse(value: unknown): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    const match = String(value).match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export function compactText(content: unknown): string {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}
