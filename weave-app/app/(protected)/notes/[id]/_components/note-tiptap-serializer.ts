import type { JSONContent } from "@tiptap/react";
import type { Block, CreateBlockData } from "@/app/_services/notes-service/notes.schema";

type BlockProperties = Record<string, unknown> | null | undefined;
type JsonRecord = Record<string, unknown>;

interface PersistedMark {
  start: number;
  end: number;
  type: string;
  attrs?: JsonRecord;
}

interface InlineExtraction {
  text: string;
  marks: PersistedMark[];
}

interface SyncBlockData extends CreateBlockData {
  children?: SyncBlockData[];
}

const ALLOWED_MARKS = new Set([
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "link",
  "highlight",
  "textStyle",
  "subscript",
  "superscript",
]);

function asRecord(value: unknown): JsonRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as JsonRecord;
}

function getBlockProperties(block: Block): JsonRecord {
  return asRecord(block.properties) ?? {};
}

function getTextFromBlock(block: Block): string {
  if (typeof block.text === "string") return block.text;
  const props = getBlockProperties(block);
  return typeof props.text === "string" ? props.text : "";
}

function getMarksFromBlock(block: Block): PersistedMark[] {
  const props = getBlockProperties(block);
  if (!Array.isArray(props.marks)) return [];
  const marks: PersistedMark[] = [];
  for (const rawMark of props.marks) {
    const mark = asRecord(rawMark);
    if (!mark) continue;
    const start = Number(mark.start);
    const end = Number(mark.end);
    const type = typeof mark.type === "string" ? mark.type : "";
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) continue;
    if (!ALLOWED_MARKS.has(type)) continue;
    const attrs = asRecord(mark.attrs);
    marks.push(attrs ? { start, end, type, attrs } : { start, end, type });
  }
  return marks;
}

function getAttrsFromBlock(block: Block): JsonRecord {
  const props = getBlockProperties(block);
  return asRecord(props.attrs) ?? {};
}

function getBlockLevel(block: Block): number {
  const props = getBlockProperties(block);
  const attrs = asRecord(props.attrs);
  if (typeof props.level === "number") return props.level;
  if (attrs && typeof attrs.level === "number") return attrs.level;
  return 2;
}

function getBlockLanguage(block: Block): string {
  const props = getBlockProperties(block);
  const attrs = asRecord(props.attrs);
  if (typeof props.language === "string") return props.language;
  if (attrs && typeof attrs.language === "string") return attrs.language;
  return "";
}

function getImageAttrs(block: Block): { src: string; alt: string } {
  const attrs = getAttrsFromBlock(block);
  const src = (typeof attrs.src === "string" ? attrs.src : getTextFromBlock(block)) || "";
  const alt = (typeof attrs.alt === "string" ? attrs.alt : "") || "";
  return { src, alt };
}

function getVideoAttrs(block: Block): { src: string } {
  const attrs = getAttrsFromBlock(block);
  const src = (typeof attrs.src === "string" ? attrs.src : getTextFromBlock(block)) || "";
  return { src };
}

function isOrderedList(block: Block): boolean {
  const attrs = getAttrsFromBlock(block);
  return attrs.ordered === true;
}

function extractTextAndMarks(content: JSONContent[] | undefined): InlineExtraction {
  let text = "";
  const marks: PersistedMark[] = [];

  const walk = (nodes: JSONContent[] | undefined) => {
    if (!nodes) return;
    for (const node of nodes) {
      if (node.type === "text") {
        const value = typeof node.text === "string" ? node.text : "";
        if (!value) continue;
        const start = text.length;
        text += value;
        const end = text.length;
        const nodeMarks = Array.isArray(node.marks) ? node.marks : [];
        for (const markNode of nodeMarks) {
          const mark = asRecord(markNode);
          if (!mark || typeof mark.type !== "string" || !ALLOWED_MARKS.has(mark.type)) continue;
          marks.push({
            start,
            end,
            type: mark.type,
            attrs: asRecord(mark.attrs),
          });
        }
        continue;
      }
      if (node.type === "hardBreak") {
        text += "\n";
        continue;
      }
      walk(node.content);
    }
  };

  walk(content);
  return { text, marks };
}

function mergeMarkRanges(marks: PersistedMark[]): PersistedMark[] {
  const sorted = [...marks].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.start !== b.start) return a.start - b.start;
    return a.end - b.end;
  });
  const merged: PersistedMark[] = [];
  for (const mark of sorted) {
    const prev = merged[merged.length - 1];
    const sameAttrs = JSON.stringify(prev?.attrs ?? {}) === JSON.stringify(mark.attrs ?? {});
    if (prev && prev.type === mark.type && sameAttrs && prev.end >= mark.start) {
      prev.end = Math.max(prev.end, mark.end);
      continue;
    }
    merged.push({ ...mark });
  }
  return merged;
}

function buildInlineContent(text: string, marks: PersistedMark[]): JSONContent[] {
  if (!text) return [];
  const safeMarks = marks
    .map((m) => ({
      ...m,
      start: Math.max(0, Math.min(text.length, m.start)),
      end: Math.max(0, Math.min(text.length, m.end)),
    }))
    .filter((m) => m.end > m.start && ALLOWED_MARKS.has(m.type));

  if (safeMarks.length === 0) {
    return [{ type: "text", text }];
  }

  const cuts = new Set<number>([0, text.length]);
  for (const mark of safeMarks) {
    cuts.add(mark.start);
    cuts.add(mark.end);
  }

  const sortedCuts = [...cuts].sort((a, b) => a - b);
  const content: JSONContent[] = [];

  for (let i = 0; i < sortedCuts.length - 1; i++) {
    const start = sortedCuts[i];
    const end = sortedCuts[i + 1];
    if (end <= start) continue;
    const segment = text.slice(start, end);
    if (!segment) continue;
    const activeMarks = safeMarks
      .filter((m) => m.start <= start && m.end >= end)
      .map((m) => (m.attrs ? { type: m.type, attrs: m.attrs } : { type: m.type }));
    const textNode: JSONContent = { type: "text", text: segment };
    if (activeMarks.length > 0) {
      textNode.marks = activeMarks;
    }
    content.push(textNode);
  }

  return content.length > 0 ? content : [{ type: "text", text }];
}

function blockToNode(block: Block): JSONContent | null {
  const text = getTextFromBlock(block);
  const marks = getMarksFromBlock(block);

  switch (block.type) {
    case "paragraph":
      return { type: "paragraph", content: buildInlineContent(text, marks) };
    case "heading": {
      const level = Math.min(6, Math.max(1, getBlockLevel(block)));
      return { type: "heading", attrs: { level }, content: buildInlineContent(text, marks) };
    }
    case "quote":
      return {
        type: "blockquote",
        content: [{ type: "paragraph", content: buildInlineContent(text, marks) }],
      };
    case "code": {
      const language = getBlockLanguage(block);
      return { type: "codeBlock", attrs: { language }, content: [{ type: "text", text }] };
    }
    case "todo":
      return {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: block.done ?? false },
            content: [{ type: "paragraph", content: buildInlineContent(text, marks) }],
          },
        ],
      };
    case "list": {
      const ordered = isOrderedList(block);
      const listType = ordered ? "orderedList" : "bulletList";
      const children = (Array.isArray(block.children) ? block.children : []) as Block[];
      if (children.length === 0) {
        return {
          type: listType,
          content: [{ type: "listItem", content: [{ type: "paragraph", content: buildInlineContent(text, marks) }] }],
        };
      }
      return {
        type: listType,
        content: children.map((child: Block) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: buildInlineContent(getTextFromBlock(child), getMarksFromBlock(child)),
            },
          ],
        })),
      };
    }
    case "divider":
      return { type: "horizontalRule" };
    case "image": {
      const { src, alt } = getImageAttrs(block);
      return { type: "image", attrs: { src, alt } };
    }
    case "video": {
      const { src } = getVideoAttrs(block);
      return { type: "video", attrs: { src } };
    }
    default:
      if (!text) return null;
      return { type: "paragraph", content: buildInlineContent(text, marks) };
  }
}

function createBlockProperties(
  text: string,
  marks: PersistedMark[],
  attrs?: JsonRecord,
  extra?: JsonRecord
): JsonRecord {
  const properties: JsonRecord = { text };
  const merged = mergeMarkRanges(marks);
  if (merged.length > 0) properties.marks = merged;
  if (attrs && Object.keys(attrs).length > 0) properties.attrs = attrs;
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      properties[key] = value;
    }
  }
  return properties;
}

export function blocksToTiptapDoc(blocks: Block[]): JSONContent {
  const content = blocks.map(blockToNode).filter((node): node is JSONContent => Boolean(node));
  return { type: "doc", content: content.length > 0 ? content : [{ type: "paragraph", content: [] }] };
}

function nodeToBlock(node: JSONContent, position: number): SyncBlockData[] {
  switch (node.type) {
    case "paragraph": {
      const inline = extractTextAndMarks(node.content);
      return [
        {
          type: "paragraph",
          text: inline.text,
          position,
          properties: createBlockProperties(inline.text, inline.marks),
        },
      ];
    }
    case "heading": {
      const inline = extractTextAndMarks(node.content);
      const level = Number(node.attrs?.level ?? 2);
      return [
        {
          type: "heading",
          text: inline.text,
          position,
          properties: createBlockProperties(
            inline.text,
            inline.marks,
            { level },
            { level }
          ),
        },
      ];
    }
    case "blockquote": {
      const paragraph = (node.content ?? []).find((child) => child.type === "paragraph");
      const inline = extractTextAndMarks(paragraph?.content);
      return [
        {
          type: "quote",
          text: inline.text,
          position,
          properties: createBlockProperties(inline.text, inline.marks),
        },
      ];
    }
    case "codeBlock": {
      const inline = extractTextAndMarks(node.content);
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      return [
        {
          type: "code",
          text: inline.text,
          position,
          properties: createBlockProperties(inline.text, [], { language }, { language }),
        },
      ];
    }
    case "taskList": {
      const items = node.content ?? [];
      const blocks: SyncBlockData[] = [];
      for (const item of items) {
        if (item.type !== "taskItem") continue;
        const paragraph = (item.content ?? []).find((child) => child.type === "paragraph");
        const inline = extractTextAndMarks(paragraph?.content);
        const checked = item.attrs?.checked === true;
        blocks.push({
          type: "todo",
          text: inline.text,
          done: checked,
          position: position + blocks.length,
          properties: createBlockProperties(inline.text, inline.marks, { checked }),
        });
      }
      return blocks;
    }
    case "bulletList":
    case "orderedList": {
      const ordered = node.type === "orderedList";
      const listChildren: SyncBlockData[] = [];
      const items = node.content ?? [];
      for (const item of items) {
        if (item.type !== "listItem") continue;
        const paragraph = (item.content ?? []).find((child) => child.type === "paragraph");
        const inline = extractTextAndMarks(paragraph?.content);
        listChildren.push({
          type: "paragraph",
          text: inline.text,
          position: listChildren.length,
          properties: createBlockProperties(inline.text, inline.marks),
        });
      }
      const firstText = listChildren[0]?.text ?? "";
      return [
        {
          type: "list",
          text: firstText,
          position,
          properties: createBlockProperties(firstText, [], { ordered }),
          children: listChildren,
        },
      ];
    }
    case "horizontalRule":
      return [{ type: "divider", text: "", position, properties: createBlockProperties("", []) }];
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      return [
        {
          type: "image",
          text: src,
          position,
          properties: createBlockProperties(src, [], { src, alt }),
        },
      ];
    }
    case "video": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      return [
        {
          type: "video",
          text: src,
          position,
          properties: createBlockProperties(src, [], { src }),
        },
      ];
    }
    default: {
      const inline = extractTextAndMarks(node.content);
      if (!inline.text.trim() && !["paragraph", "heading"].includes(String(node.type))) {
        return [];
      }
      return [
        {
          type: "paragraph",
          text: inline.text,
          position,
          properties: createBlockProperties(inline.text, inline.marks),
        },
      ];
    }
  }
}

export function tiptapDocToBlocks(doc: JSONContent): SyncBlockData[] {
  const blocks: SyncBlockData[] = [];
  for (const node of doc.content ?? []) {
    const fromNode = nodeToBlock(node, blocks.length);
    for (const block of fromNode) {
      block.position = blocks.length;
      blocks.push(block);
    }
  }
  return blocks;
}

export function isDocumentEmpty(doc: JSONContent): boolean {
  if (!doc.content || doc.content.length === 0) return true;
  if (doc.content.length === 1) {
    const first = doc.content[0];
    if (first.type === "paragraph") {
      const inline = extractTextAndMarks(first.content);
      return inline.text.trim() === "";
    }
  }
  return false;
}
