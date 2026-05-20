import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";

/**
 * Seeds the TipTap editor from stored markdown (one paragraph per non-empty line).
 */
export function markdownToInitialBlocks(markdown: string): CreateBlockData[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [];

  const lines = trimmed.split(/\n/);
  const blocks: CreateBlockData[] = [];

  for (const line of lines) {
    const text = line.trimEnd();
    if (!text && blocks.length > 0) {
      blocks.push({ type: "paragraph", text: "" });
      continue;
    }
    if (!text) continue;

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(text);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        text: headingMatch[2],
        properties: { level: headingMatch[1].length },
      });
      continue;
    }

    if (text.startsWith("> ")) {
      blocks.push({ type: "quote", text: text.slice(2) });
      continue;
    }

    blocks.push({ type: "paragraph", text });
  }

  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: trimmed }];
}
