export const INLINE_TOKEN_TYPES = {
  BOLD: "bold",
  CODE: "code",
  IMAGE: "image",
  ITALIC: "italic",
  LINK: "link",
  STRIKETHROUGH: "strikethrough",
  TEXT: "text",
} as const;

export type InlineTokenType = typeof INLINE_TOKEN_TYPES[keyof typeof INLINE_TOKEN_TYPES];

export const BLOCK_TYPES = {
  BLOCKQUOTE: "blockquote",
  CODE_BLOCK: "code_block",
  HORIZONTAL_RULE: "horizontal_rule",
  HTML: "html",
  ORDERED_LIST: "ordered_list",
  PARAGRAPH: "paragraph",
  TABLE: "table",
  UNORDERED_LIST: "unordered_list",
} as const;

export type BlockType = typeof BLOCK_TYPES[keyof typeof BLOCK_TYPES];

export interface InlineToken {
  type: string;
  text: string;
  href?: string;
  title?: string | null;
  alt?: string;
  src?: string;
}

export interface MarkdownBlock {
  type: string;
  startLine: number;
  endLine: number;
  level?: number;
  text?: string;
  inline?: InlineToken[];
  code?: { raw: string; lang: string | null };
  items?: Array<{ depth: number; text: string; inline: InlineToken[] }>;
  lines?: Array<{ raw: string; text: string; inline: InlineToken[] }>;
  table?: {
    align: string[];
    headers: Array<{ raw: string; text: string; inline: InlineToken[] }>;
    rows: Array<{ raw: string; cells: Array<{ raw: string; text: string; inline: InlineToken[] }> }>;
  };
}

export interface HeadingEntity {
  level: number;
  line: number;
  text: string;
}

export interface LinkEntity {
  href: string;
  title: string | null;
  text: string;
}

export interface ImageEntity {
  src: string;
  alt: string;
}

export interface MarkdownEntities {
  headings: HeadingEntity[];
  links: LinkEntity[];
  images: ImageEntity[];
}

export interface MarkdownStats {
  blockCount: number;
  headingCount: number;
  listItemCount: number;
  codeBlockCount: number;
  linkCount: number;
  imageCount: number;
  wordCount: number;
  characterCount: number;
}

export interface MarkdownInterpretation {
  source: string;
  normalizedText: string;
  blocks: MarkdownBlock[];
  entities: MarkdownEntities;
  stats: MarkdownStats;
}

/**
 * Interpret Markdown into an LLM-friendly structure.
 * It parses block-level and inline-level elements and exposes normalized text
 * and semantic entities so the model can reason over content safely.
 *
 * @param markdown - The raw markdown content.
 * @returns The parsed MarkdownInterpretation.
 */
export function interpretMarkdownForLlm(markdown = ""): MarkdownInterpretation {
  const source =
    typeof markdown === "string" ? markdown : String(markdown ?? "");
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  const entities: MarkdownEntities = {
    headings: [],
    images: [],
    links: [],
  };

  let cursor = 0;

  while (cursor < lines.length) {
    const current = lines[cursor];
    const trimmed = current.trim();

    if (!trimmed) {
      cursor += 1;
      continue;
    }

    const headingMatch = current.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const rawText = headingMatch[2];
      const inline = parseInline(rawText, entities);
      const text = toPlainText(inline);

      blocks.push({
        endLine: cursor + 1,
        inline,
        level,
        startLine: cursor + 1,
        text,
        type: "heading",
      });
      entities.headings.push({ level, line: cursor + 1, text });
      cursor += 1;
      continue;
    }

    if (/^\s{0,3}(```|~~~)/.test(current)) {
      const block = parseCodeBlock(lines, cursor);
      blocks.push(block.block);
      cursor = block.nextCursor;
      continue;
    }

    if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(current)) {
      blocks.push({
        endLine: cursor + 1,
        startLine: cursor + 1,
        type: BLOCK_TYPES.HORIZONTAL_RULE,
      });
      cursor += 1;
      continue;
    }

    if (/^\s{0,3}>/.test(current)) {
      const block = parseBlockquote(lines, cursor, entities);
      blocks.push(block.block);
      cursor = block.nextCursor;
      continue;
    }

    if (/^\s{0,3}<[^>]+>/.test(current)) {
      blocks.push({
        endLine: cursor + 1,
        startLine: cursor + 1,
        text: current.trim(),
        type: BLOCK_TYPES.HTML,
      });
      cursor += 1;
      continue;
    }

    if (isTableStart(lines, cursor)) {
      const block = parseTable(lines, cursor, entities);
      blocks.push(block.block);
      cursor = block.nextCursor;
      continue;
    }

    if (isListItemLine(current)) {
      const block = parseList(lines, cursor, entities);
      blocks.push(block.block);
      cursor = block.nextCursor;
      continue;
    }

    const block = parseParagraph(lines, cursor, entities);
    blocks.push(block.block);
    cursor = block.nextCursor;
  }

  const normalizedText = buildNormalizedText(blocks);
  const stats = buildStats(source, normalizedText, blocks, entities);

  return {
    blocks,
    entities,
    normalizedText,
    source,
    stats,
  };
}

function parseCodeBlock(lines: string[], start: number): { block: MarkdownBlock; nextCursor: number } {
  const opener = lines[start].trim();
  const fence = opener.slice(0, 3);
  const lang = opener.slice(3).trim() || null;
  const content: string[] = [];
  let cursor = start + 1;

  while (cursor < lines.length) {
    const candidate = lines[cursor].trim();
    if (candidate.startsWith(fence)) {
      cursor += 1;
      break;
    }
    content.push(lines[cursor]);
    cursor += 1;
  }

  return {
    block: {
      code: { lang, raw: content.join("\n") },
      endLine: cursor,
      startLine: start + 1,
      type: BLOCK_TYPES.CODE_BLOCK,
    },
    nextCursor: cursor,
  };
}

function parseBlockquote(lines: string[], start: number, entities: MarkdownEntities): { block: MarkdownBlock; nextCursor: number } {
  let cursor = start;
  const quoteLines: string[] = [];

  while (cursor < lines.length && /^\s{0,3}>/.test(lines[cursor])) {
    quoteLines.push(lines[cursor].replace(/^\s{0,3}>\s?/, ""));
    cursor += 1;
  }

  const parsedLines = quoteLines.map((line) => {
    const inline = parseInline(line, entities);
    return { inline, raw: line, text: toPlainText(inline) };
  });

  return {
    block: {
      endLine: cursor,
      lines: parsedLines,
      startLine: start + 1,
      text: parsedLines.map((line) => line.text).join("\n"),
      type: BLOCK_TYPES.BLOCKQUOTE,
    },
    nextCursor: cursor,
  };
}

function isListItemLine(line: string): boolean {
  return /^\s{0,3}(([-*+])\s+|(\d+)\.\s+)/.test(line);
}

function parseList(lines: string[], start: number, entities: MarkdownEntities): { block: MarkdownBlock; nextCursor: number } {
  const isOrdered = /^\s{0,3}\d+\.\s+/.test(lines[start]);
  const items: Array<{ depth: number; text: string; inline: InlineToken[] }> = [];
  let cursor = start;

  while (cursor < lines.length) {
    const line = lines[cursor];
    if (!line.trim()) {
      cursor += 1;
      break;
    }

    if (!isListItemLine(line)) {
      break;
    }

    const currentIsOrdered = /^\s{0,3}\d+\.\s+/.test(line);
    if (currentIsOrdered !== isOrdered) {
      break;
    }

    const content = line.replace(/^\s{0,3}(([-*+])\s+|(\d+)\.\s+)/, "");
    const depth = Math.floor((line.match(/^\s*/)?.[0].length || 0) / 2);
    const inline = parseInline(content, entities);

    items.push({
      depth,
      inline,
      text: toPlainText(inline),
    });

    cursor += 1;
  }

  return {
    block: {
      endLine: cursor,
      items,
      startLine: start + 1,
      type: isOrdered ? BLOCK_TYPES.ORDERED_LIST : BLOCK_TYPES.UNORDERED_LIST,
    },
    nextCursor: cursor,
  };
}

function isTableStart(lines: string[], index: number): boolean {
  const header = lines[index];
  const separator = lines[index + 1];
  if (!header || !separator) {
    return false;
  }

  if (!header.includes("|")) {
    return false;
  }

  return /^\s*\|?[\s:-|]+\|?\s*$/.test(separator) && separator.includes("-");
}

function parseTable(lines: string[], start: number, entities: MarkdownEntities): { block: MarkdownBlock; nextCursor: number } {
  const headerRaw = lines[start];
  const separatorRaw = lines[start + 1];
  const headers = splitTableRow(headerRaw).map((cell) => {
    const inline = parseInline(cell, entities);
    return { inline, raw: cell, text: toPlainText(inline) };
  });
  const align = splitTableRow(separatorRaw).map((token) => {
    const isLeft = token.startsWith(":");
    const isRight = token.endsWith(":");
    if (isLeft && isRight) {
      return "center";
    }
    if (isRight) {
      return "right";
    }
    if (isLeft) {
      return "left";
    }
    return "default";
  });

  const rows: Array<{ cells: Array<{ raw: string; text: string; inline: InlineToken[] }>; raw: string }> = [];
  let cursor = start + 2;
  while (cursor < lines.length && lines[cursor].includes("|")) {
    const rawCells = splitTableRow(lines[cursor]);
    const cells = rawCells.map((cell) => {
      const inline = parseInline(cell, entities);
      return { inline, raw: cell, text: toPlainText(inline) };
    });
    rows.push({ cells, raw: lines[cursor] });
    cursor += 1;
  }

  return {
    block: {
      endLine: cursor,
      startLine: start + 1,
      table: {
        align,
        headers,
        rows,
      },
      type: BLOCK_TYPES.TABLE,
    },
    nextCursor: cursor,
  };
}

function splitTableRow(row: string): string[] {
  const sanitized = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return sanitized.split("|").map((cell) => cell.trim());
}

function parseParagraph(lines: string[], start: number, entities: MarkdownEntities): { block: MarkdownBlock; nextCursor: number } {
  const content: string[] = [];
  let cursor = start;

  while (cursor < lines.length) {
    const line = lines[cursor];
    const trimmed = line.trim();
    if (!trimmed) {
      break;
    }

    if (
      /^\s{0,3}(#{1,6})\s+/.test(line) ||
      /^\s{0,3}(```|~~~)/.test(line) ||
      /^\s{0,3}>/.test(line) ||
      /^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
      /^\s{0,3}<[^>]+>/.test(line) ||
      isListItemLine(line) ||
      isTableStart(lines, cursor)
    ) {
      break;
    }

    content.push(line.trim());
    cursor += 1;
  }

  const rawText = content.join(" ");
  const inline = parseInline(rawText, entities);

  return {
    block: {
      endLine: cursor,
      inline,
      startLine: start + 1,
      text: toPlainText(inline),
      type: BLOCK_TYPES.PARAGRAPH,
    },
    nextCursor: cursor,
  };
}

function parseInline(input: string, entities: MarkdownEntities): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const rest = input.slice(cursor);

    const imageMatch = rest.match(
      /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/
    );
    if (imageMatch) {
      const [, alt, src] = imageMatch;
      tokens.push({
        alt,
        src,
        text: alt || "",
        type: INLINE_TOKEN_TYPES.IMAGE,
      });
      entities.images.push({ alt: alt || "", src });
      cursor += imageMatch[0].length;
      continue;
    }

    const linkMatch = rest.match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/);
    if (linkMatch) {
      const [, text, href, title] = linkMatch;
      tokens.push({
        href,
        text,
        title: title || null,
        type: INLINE_TOKEN_TYPES.LINK,
      });
      entities.links.push({ href, text, title: title || null });
      cursor += linkMatch[0].length;
      continue;
    }

    const codeMatch = rest.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push({ text: codeMatch[1], type: INLINE_TOKEN_TYPES.CODE });
      cursor += codeMatch[0].length;
      continue;
    }

    const boldMatch = rest.match(/^\*\*([^*]+)\*\*|^__([^_]+)__/);
    if (boldMatch) {
      const text = boldMatch[1] || boldMatch[2];
      tokens.push({ text, type: INLINE_TOKEN_TYPES.BOLD });
      cursor += boldMatch[0].length;
      continue;
    }

    const italicMatch = rest.match(/^\*([^*]+)\*|^_([^_]+)_/);
    if (italicMatch) {
      const text = italicMatch[1] || italicMatch[2];
      tokens.push({ text, type: INLINE_TOKEN_TYPES.ITALIC });
      cursor += italicMatch[0].length;
      continue;
    }

    const strikeMatch = rest.match(/^~~([^~]+)~~/);
    if (strikeMatch) {
      tokens.push({
        text: strikeMatch[1],
        type: INLINE_TOKEN_TYPES.STRIKETHROUGH,
      });
      cursor += strikeMatch[0].length;
      continue;
    }

    const nextSpecial = rest.search(/(!\[|\[|`|\*\*|__|\*|_|~~)/);
    if (nextSpecial === -1) {
      tokens.push({ text: rest, type: INLINE_TOKEN_TYPES.TEXT });
      break;
    }

    if (nextSpecial > 0) {
      tokens.push({
        text: rest.slice(0, nextSpecial),
        type: INLINE_TOKEN_TYPES.TEXT,
      });
      cursor += nextSpecial;
      continue;
    }

    tokens.push({ text: rest[0], type: INLINE_TOKEN_TYPES.TEXT });
    cursor += 1;
  }

  return mergeAdjacentTextTokens(tokens);
}

function mergeAdjacentTextTokens(tokens: InlineToken[]): InlineToken[] {
  const merged: InlineToken[] = [];
  for (const token of tokens) {
    const previous = merged[merged.length - 1];
    if (
      previous &&
      previous.type === INLINE_TOKEN_TYPES.TEXT &&
      token.type === INLINE_TOKEN_TYPES.TEXT
    ) {
      previous.text += token.text;
      continue;
    }
    merged.push(token);
  }
  return merged;
}

function toPlainText(inlineTokens: InlineToken[]): string {
  return inlineTokens
    .map((token) => {
      if (token.type === INLINE_TOKEN_TYPES.IMAGE) {
        return token.alt || "";
      }
      return token.text || "";
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function buildNormalizedText(blocks: MarkdownBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      lines.push(`${"#".repeat(block.level || 1)} ${block.text || ""}`.trim());
      continue;
    }

    if (
      block.type === BLOCK_TYPES.PARAGRAPH ||
      block.type === BLOCK_TYPES.BLOCKQUOTE
    ) {
      lines.push(block.text || "");
      continue;
    }

    if (block.type === BLOCK_TYPES.CODE_BLOCK) {
      const lang = block.code?.lang ? `:${block.code.lang}` : "";
      lines.push(`[code${lang}]`);
      lines.push(block.code?.raw || "");
      lines.push("[/code]");
      continue;
    }

    if (
      block.type === BLOCK_TYPES.ORDERED_LIST ||
      block.type === BLOCK_TYPES.UNORDERED_LIST
    ) {
      for (const item of block.items || []) {
        const bullet = block.type === BLOCK_TYPES.ORDERED_LIST ? "1." : "-";
        lines.push(
          `${"  ".repeat(item.depth || 0)}${bullet} ${item.text || ""}`.trimEnd()
        );
      }
      continue;
    }

    if (block.type === BLOCK_TYPES.TABLE && block.table) {
      const headerText = block.table.headers
        .map((cell) => cell.text)
        .join(" | ");
      lines.push(`| ${headerText} |`);
      for (const row of block.table.rows) {
        const rowText = row.cells.map((cell) => cell.text).join(" | ");
        lines.push(`| ${rowText} |`);
      }
      continue;
    }

    if (block.type === BLOCK_TYPES.HORIZONTAL_RULE) {
      lines.push("---");
    }
  }

  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildStats(
  source: string,
  normalizedText: string,
  blocks: MarkdownBlock[],
  entities: MarkdownEntities
): MarkdownInterpretation["stats"] {
  const listItemCount = blocks.reduce((total, block) => {
    if (
      block.type === BLOCK_TYPES.ORDERED_LIST ||
      block.type === BLOCK_TYPES.UNORDERED_LIST
    ) {
      return total + (block.items?.length || 0);
    }
    return total;
  }, 0);

  return {
    blockCount: blocks.length,
    characterCount: source.length,
    codeBlockCount: blocks.filter(
      (block) => block.type === BLOCK_TYPES.CODE_BLOCK
    ).length,
    headingCount: entities.headings.length,
    imageCount: entities.images.length,
    linkCount: entities.links.length,
    listItemCount,
    wordCount: normalizedText
      ? normalizedText.split(/\s+/).filter(Boolean).length
      : 0,
  };
}
