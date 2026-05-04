"use strict";

const INLINE_TOKEN_TYPES = {
  BOLD: "bold",
  CODE: "code",
  IMAGE: "image",
  ITALIC: "italic",
  LINK: "link",
  STRIKETHROUGH: "strikethrough",
  TEXT: "text",
};

const BLOCK_TYPES = {
  BLOCKQUOTE: "blockquote",
  CODE_BLOCK: "code_block",
  HORIZONTAL_RULE: "horizontal_rule",
  HTML: "html",
  ORDERED_LIST: "ordered_list",
  PARAGRAPH: "paragraph",
  TABLE: "table",
  UNORDERED_LIST: "unordered_list",
};

/**
 * @typedef {Object} InlineToken
 * @property {string} type
 * @property {string} text
 * @property {string} [href]
 * @property {string} [title]
 * @property {string} [alt]
 * @property {string} [src]
 */

/**
 * @typedef {Object} MarkdownBlock
 * @property {string} type
 * @property {number} startLine
 * @property {number} endLine
 * @property {number} [level]
 * @property {string} [text]
 * @property {InlineToken[]} [inline]
 * @property {{ raw: string, lang: string|null }} [code]
 * @property {Array<{ depth: number, text: string, inline: InlineToken[] }>} [items]
 * @property {Array<{ raw: string, text: string, inline: InlineToken[] }>} [lines]
 * @property {{ align: string[], headers: { raw: string, text: string, inline: InlineToken[] }[], rows: { raw: string, cells: { raw: string, text: string, inline: InlineToken[] }[] }[] }} [table]
 */

/**
 * @typedef {Object} MarkdownInterpretation
 * @property {string} source
 * @property {string} normalizedText
 * @property {MarkdownBlock[]} blocks
 * @property {{ headings: { level: number, text: string, line: number }[], links: { href: string, title: string|null, text: string }[], images: { src: string, alt: string }[] }} entities
 * @property {{ blockCount: number, headingCount: number, listItemCount: number, codeBlockCount: number, linkCount: number, imageCount: number, wordCount: number, characterCount: number }} stats
 */

/**
 * Interpret Markdown into an LLM-friendly structure.
 * It parses block-level and inline-level elements and exposes normalized text
 * and semantic entities so the model can reason over content safely.
 *
 * @param {string} markdown
 * @returns {MarkdownInterpretation}
 */
function interpretMarkdownForLlm(markdown = "") {
  const source = typeof markdown === "string" ? markdown : String(markdown ?? "");
  const lines = source.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const blocks = [];
  const entities = {
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

/**
 * @param {string[]} lines
 * @param {number} start
 * @returns {{ block: MarkdownBlock, nextCursor: number }}
 */
function parseCodeBlock(lines, start) {
  const opener = lines[start].trim();
  const fence = opener.slice(0, 3);
  const lang = opener.slice(3).trim() || null;
  const content = [];
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

/**
 * @param {string[]} lines
 * @param {number} start
 * @param {{ links: any[], images: any[] }} entities
 * @returns {{ block: MarkdownBlock, nextCursor: number }}
 */
function parseBlockquote(lines, start, entities) {
  let cursor = start;
  const quoteLines = [];

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

/**
 * @param {string} line
 * @returns {boolean}
 */
function isListItemLine(line) {
  return /^\s{0,3}(([-*+])\s+|(\d+)\.\s+)/.test(line);
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @param {{ links: any[], images: any[] }} entities
 * @returns {{ block: MarkdownBlock, nextCursor: number }}
 */
function parseList(lines, start, entities) {
  const isOrdered = /^\s{0,3}\d+\.\s+/.test(lines[start]);
  const items = [];
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

/**
 * @param {string[]} lines
 * @param {number} index
 * @returns {boolean}
 */
function isTableStart(lines, index) {
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

/**
 * @param {string[]} lines
 * @param {number} start
 * @param {{ links: any[], images: any[] }} entities
 * @returns {{ block: MarkdownBlock, nextCursor: number }}
 */
function parseTable(lines, start, entities) {
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

  const rows = [];
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

/**
 * @param {string} row
 * @returns {string[]}
 */
function splitTableRow(row) {
  const sanitized = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return sanitized.split("|").map((cell) => cell.trim());
}

/**
 * @param {string[]} lines
 * @param {number} start
 * @param {{ links: any[], images: any[] }} entities
 * @returns {{ block: MarkdownBlock, nextCursor: number }}
 */
function parseParagraph(lines, start, entities) {
  const content = [];
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

/**
 * @param {string} input
 * @param {{ links: any[], images: any[] }} entities
 * @returns {InlineToken[]}
 */
function parseInline(input, entities) {
  const tokens = [];
  let cursor = 0;

  while (cursor < input.length) {
    const rest = input.slice(cursor);

    const imageMatch = rest.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)/);
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
      tokens.push({ text: strikeMatch[1], type: INLINE_TOKEN_TYPES.STRIKETHROUGH });
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

/**
 * @param {InlineToken[]} tokens
 * @returns {InlineToken[]}
 */
function mergeAdjacentTextTokens(tokens) {
  const merged = [];
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

/**
 * @param {InlineToken[]} inlineTokens
 * @returns {string}
 */
function toPlainText(inlineTokens) {
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

/**
 * @param {MarkdownBlock[]} blocks
 * @returns {string}
 */
function buildNormalizedText(blocks) {
  const lines = [];

  for (const block of blocks) {
    if (block.type === "heading") {
      lines.push(`${"#".repeat(block.level || 1)} ${block.text || ""}`.trim());
      continue;
    }

    if (block.type === BLOCK_TYPES.PARAGRAPH || block.type === BLOCK_TYPES.BLOCKQUOTE) {
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

    if (block.type === BLOCK_TYPES.ORDERED_LIST || block.type === BLOCK_TYPES.UNORDERED_LIST) {
      for (const item of block.items || []) {
        const bullet = block.type === BLOCK_TYPES.ORDERED_LIST ? "1." : "-";
        lines.push(`${"  ".repeat(item.depth || 0)}${bullet} ${item.text || ""}`.trimEnd());
      }
      continue;
    }

    if (block.type === BLOCK_TYPES.TABLE && block.table) {
      const headerText = block.table.headers.map((cell) => cell.text).join(" | ");
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

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * @param {string} source
 * @param {string} normalizedText
 * @param {MarkdownBlock[]} blocks
 * @param {{ headings: any[], links: any[], images: any[] }} entities
 * @returns {MarkdownInterpretation["stats"]}
 */
function buildStats(source, normalizedText, blocks, entities) {
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
    codeBlockCount: blocks.filter((block) => block.type === BLOCK_TYPES.CODE_BLOCK).length,
    headingCount: entities.headings.length,
    imageCount: entities.images.length,
    linkCount: entities.links.length,
    listItemCount,
    wordCount: normalizedText ? normalizedText.split(/\s+/).filter(Boolean).length : 0,
  };
}

module.exports = {
  BLOCK_TYPES,
  INLINE_TOKEN_TYPES,
  interpretMarkdownForLlm,
};
