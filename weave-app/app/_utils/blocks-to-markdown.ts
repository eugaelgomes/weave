import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";

type BlockProperties = Record<string, unknown> | null | undefined;

interface PersistedMark {
  start: number;
  end: number;
  type: string;
  attrs?: Record<string, unknown>;
}

type BlockWithChildren = CreateBlockData & { children?: BlockWithChildren[] };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function getMarks(properties: BlockProperties): PersistedMark[] {
  const props = asRecord(properties);
  if (!props || !Array.isArray(props.marks)) return [];
  const marks: PersistedMark[] = [];
  for (const raw of props.marks) {
    const mark = asRecord(raw);
    if (!mark) continue;
    const start = Number(mark.start);
    const end = Number(mark.end);
    const type = typeof mark.type === "string" ? mark.type : "";
    if (!Number.isFinite(start) || !Number.isFinite(end) || !type) continue;
    marks.push({ start, end, type, attrs: asRecord(mark.attrs) });
  }
  return marks;
}

function applyMarks(text: string, marks: PersistedMark[]): string {
  if (!text) return "";
  if (!marks.length) return text;

  let result = text;
  const sortedMarks = [...marks].sort((a, b) => b.start - a.start);

  for (const mark of sortedMarks) {
    const { start, end, type, attrs } = mark;
    const part = result.slice(start, end);
    let wrapped = part;

    switch (type) {
      case "bold":
        wrapped = `**${part}**`;
        break;
      case "italic":
        wrapped = `*${part}*`;
        break;
      case "code":
        wrapped = `\`${part}\``;
        break;
      case "link":
        wrapped = `[${part}](${typeof attrs?.href === "string" ? attrs.href : ""})`;
        break;
      case "strike":
        wrapped = `~~${part}~~`;
        break;
      default:
        wrapped = part;
    }

    result = result.slice(0, start) + wrapped + result.slice(end);
  }

  return result;
}

function blockText(block: BlockWithChildren): string {
  return typeof block.text === "string" ? block.text : "";
}

/**
 * Converts a tree of note-style blocks into markdown (aligned with API notes-to-markdown).
 */
export function blocksToMarkdown(blocks: BlockWithChildren[], depth = 0): string {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";

  return blocks
    .map((block) => {
      const indent = "  ".repeat(depth);
      const marks = getMarks(block.properties);
      const text = applyMarks(blockText(block), marks);
      let content = "";

      switch (block.type) {
        case "paragraph":
          content = text ? `${indent}${text}\n` : "\n";
          break;
        case "heading": {
          const props = asRecord(block.properties);
          const level = Math.min((Number(props?.level) || 1) + depth, 6);
          content = text ? `${"#".repeat(level)} ${text}\n` : "\n";
          break;
        }
        case "todo": {
          const props = asRecord(block.properties);
          const attrs = asRecord(props?.attrs);
          const checked = Boolean(block.done) || Boolean(attrs?.checked);
          content = `${indent}- [${checked ? "x" : " "}] ${text}\n`;
          break;
        }
        case "list": {
          const props = asRecord(block.properties);
          const attrs = asRecord(props?.attrs);
          const marker = attrs?.ordered ? "1." : "-";
          content = `${indent}${marker} ${text}\n`;
          if (block.children?.length) {
            content += blocksToMarkdown(block.children, depth + 1);
          }
          break;
        }
        case "blockquote":
        case "quote":
          content = text ? `${indent}> ${text}\n` : "\n";
          break;
        case "code_block":
        case "code": {
          const props = asRecord(block.properties);
          const lang = typeof props?.language === "string" ? props.language : "";
          const raw = blockText(block);
          content = `${indent}\`\`\`${lang}\n${raw}\n${indent}\`\`\`\n`;
          break;
        }
        default:
          content = text ? `${indent}${text}\n` : "";
      }

      return content;
    })
    .join("\n")
    .trim();
}

/**
 * Returns true when markdown has meaningful non-whitespace content.
 */
export function hasMarkdownContent(markdown: string): boolean {
  return markdown.replace(/\s+/g, "").length > 0;
}
