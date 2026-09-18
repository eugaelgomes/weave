import type { Block, CreateBlockData } from "@/app/_services/notes-service/notes.schema";

export type PromptBlock = CreateBlockData & {
  children?: PromptBlock[];
};

export type PromptDocument = PromptBlock[];

type Mark = {
  start: number;
  end: number;
  type: string;
  attrs?: Record<string, unknown>;
};

type BlockProperties = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getProperties(block: PromptBlock): BlockProperties {
  return asRecord(block.properties);
}

function getMarks(block: PromptBlock): Mark[] {
  const marks = getProperties(block).marks;
  if (!Array.isArray(marks)) return [];

  return marks.flatMap((mark) => {
    const value = asRecord(mark);
    const start = Number(value.start);
    const end = Number(value.end);
    const type = typeof value.type === "string" ? value.type : "";
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || !type) {
      return [];
    }

    const attrs = asRecord(value.attrs);
    return [{ start, end, type, ...(Object.keys(attrs).length > 0 ? { attrs } : {}) }];
  });
}

function getAttrs(block: PromptBlock): Record<string, unknown> {
  return asRecord(getProperties(block).attrs);
}

function markDelimiters(mark: Mark): { open: string; close: string } | null {
  switch (mark.type) {
    case "bold":
      return { open: "**", close: "**" };
    case "italic":
      return { open: "*", close: "*" };
    case "strike":
      return { open: "~~", close: "~~" };
    case "code":
      return { open: "`", close: "`" };
    case "highlight":
      return { open: "==", close: "==" };
    case "underline":
      return { open: "<u>", close: "</u>" };
    case "link": {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
      return href ? { open: "[", close: `](${href})` } : null;
    }
    default:
      return null;
  }
}

function inlineMarkdown(text: string, marks: Mark[]): string {
  const validMarks = marks
    .map((mark) => ({
      ...mark,
      start: Math.max(0, Math.min(text.length, mark.start)),
      end: Math.max(0, Math.min(text.length, mark.end)),
    }))
    .filter((mark) => mark.end > mark.start && markDelimiters(mark));

  let output = "";
  for (let index = 0; index <= text.length; index += 1) {
    const closing = validMarks
      .filter((mark) => mark.end === index)
      .sort((a, b) => b.start - a.start);
    for (const mark of closing) {
      output += markDelimiters(mark)?.close ?? "";
    }

    const opening = validMarks.filter((mark) => mark.start === index).sort((a, b) => b.end - a.end);
    for (const mark of opening) {
      output += markDelimiters(mark)?.open ?? "";
    }

    if (index < text.length) output += text[index];
  }
  return output;
}

function blockText(block: PromptBlock): string {
  return typeof block.text === "string" ? block.text : "";
}

function blockMarkdown(block: PromptBlock): string {
  const text = inlineMarkdown(blockText(block), getMarks(block));
  const attrs = getAttrs(block);

  switch (block.type) {
    case "heading": {
      const level = Number(attrs.level ?? getProperties(block).level ?? 2);
      return `${"#".repeat(Math.min(4, Math.max(1, level)))} ${text}`;
    }
    case "quote":
      return text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "code": {
      const language = typeof attrs.language === "string" ? attrs.language : "";
      return `\`\`\`${language}\n${blockText(block)}\n\`\`\``;
    }
    case "todo":
      return `- [${block.done ? "x" : " "}] ${text}`;
    case "list": {
      const ordered = attrs.ordered === true;
      const children = block.children ?? [];
      const items = children.length > 0 ? children : [block];
      return items
        .map(
          (item, index) =>
            `${ordered ? `${index + 1}.` : "-"} ${inlineMarkdown(blockText(item), getMarks(item))}`
        )
        .join("\n");
    }
    case "divider":
      return "---";
    case "image": {
      const src = typeof attrs.src === "string" ? attrs.src : blockText(block);
      const alt = typeof attrs.alt === "string" ? attrs.alt : "";
      return src ? `![${alt}](${src})` : "";
    }
    case "video": {
      const src = typeof attrs.src === "string" ? attrs.src : blockText(block);
      return src ? `[Vídeo](${src})` : "";
    }
    default:
      return text;
  }
}

export function promptDocumentToMarkdown(document: PromptDocument): string {
  return document.map(blockMarkdown).filter(Boolean).join("\n\n").trim();
}

function parseInlineMarkdown(source: string): { text: string; marks: Mark[] } {
  const marks: Mark[] = [];
  let text = "";
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)|(\*\*|__|~~|`|\*)(.*?)\3/g;
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    text += source.slice(cursor, index);
    const start = text.length;
    const content = match[1] ?? match[4] ?? "";
    text += content;
    const end = text.length;

    if (match[1] !== undefined) {
      marks.push({ start, end, type: "link", attrs: { href: match[2] } });
    } else {
      const marker = match[3];
      const type =
        marker === "**" || marker === "__"
          ? "bold"
          : marker === "~~"
            ? "strike"
            : marker === "`"
              ? "code"
              : "italic";
      marks.push({ start, end, type });
    }
    cursor = index + match[0].length;
  }

  text += source.slice(cursor);
  return { text, marks };
}

function textBlock(type: string, source: string, extra: Partial<PromptBlock> = {}): PromptBlock {
  const inline = parseInlineMarkdown(source);
  const properties: Record<string, unknown> = { text: inline.text };
  if (inline.marks.length > 0) properties.marks = inline.marks;
  if (extra.properties) Object.assign(properties, extra.properties);

  return { type, ...extra, text: inline.text, properties };
}

/** Converts legacy Markdown prompts into the block shape used by the shared editor. */
export function markdownToPromptDocument(markdown: string): PromptDocument {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: PromptDocument = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim()) continue;

    const code = line.match(/^```([^\s]*)\s*$/);
    if (code) {
      const content: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        content.push(lines[index]);
        index += 1;
      }
      blocks.push({
        type: "code",
        text: content.join("\n"),
        properties: { text: content.join("\n"), attrs: { language: code[1] || "plaintext" } },
      });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push(
        textBlock("heading", heading[2], {
          properties: { attrs: { level: heading[1].length }, level: heading[1].length },
        })
      );
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ type: "divider", text: "", properties: { text: "" } });
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      blocks.push(textBlock("quote", quote[1]));
      continue;
    }

    const todo = line.match(/^-\s+\[([ xX])\]\s+(.+)$/);
    if (todo) {
      blocks.push({ ...textBlock("todo", todo[2]), done: todo[1].toLowerCase() === "x" });
      continue;
    }

    const list = line.match(/^([-*])\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (list || ordered) {
      const listItems: PromptBlock[] = [];
      const isOrdered = Boolean(ordered);
      while (index < lines.length) {
        const item = isOrdered
          ? lines[index].match(/^\d+\.\s+(.+)$/)
          : lines[index].match(/^[-*]\s+(.+)$/);
        if (!item) break;
        listItems.push(textBlock("paragraph", item[1]));
        index += 1;
      }
      index -= 1;
      blocks.push({
        type: "list",
        text: listItems[0]?.text ?? "",
        children: listItems,
        properties: { text: listItems[0]?.text ?? "", attrs: { ordered: isOrdered } },
      });
      continue;
    }

    blocks.push(textBlock("paragraph", line));
  }

  return blocks.length > 0 ? blocks : [{ type: "paragraph", text: "", properties: { text: "" } }];
}

export function isPromptDocument(value: unknown): value is PromptDocument {
  return (
    Array.isArray(value) &&
    value.every((block) => {
      const candidate = asRecord(block);
      return typeof candidate.type === "string";
    })
  );
}

/** RichTextEditor was built for persisted note blocks, which require an id. */
export function promptDocumentToEditorBlocks(document: PromptDocument): Block[] {
  const withIds = (block: PromptBlock, path: string): Block => ({
    ...block,
    id: `agent-prompt-${path}`,
    position: block.position ?? 0,
    children: block.children?.map((child, index) => withIds(child, `${path}-${index}`)),
  });

  return document.map((block, index) => withIds(block, String(index)));
}
