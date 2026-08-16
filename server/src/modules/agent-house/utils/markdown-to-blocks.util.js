/**
 * @module agent-house/utils/markdown-to-blocks.util
 * @description Utility to parse and convert raw markdown strings into structured TipTap blocks.
 *
 * Dependencies:
 * - `@/modules/notes/block-normalizer`: For generating valid `newBlockId`s.
 *
 * Used by:
 * - `agent-house/handlers/create-note.handler.js`: To format LLM markdown output into structured note blocks.
 * - `agent-house/handlers/update-note-content.handler.js`: To parse markdown fallbacks into blocks.
 */
const { newBlockId } = require("@/modules/notes/block-normalizer");

function extractMarks(text) {
  let clean = text;
  const marks = [];

  const extract = (regex, type, isLink) => {
    let match;
    while ((match = regex.exec(clean)) !== null) {
      const start = match.index;
      const inner = match[1];
      const end = start + inner.length;

      const mark = { end, start, type };
      if (isLink) mark.attrs = { href: match[2] };

      marks.push(mark);
      clean = clean.substring(0, start) + inner + clean.substring(start + match[0].length);

      const shift = match[0].length - inner.length;
      for (const m of marks) {
        if (m === mark) continue;
        if (m.start > start) {
          m.start = Math.max(start, m.start - shift);
          m.end = Math.max(start, m.end - shift);
        } else if (m.start <= start && m.end >= start + match[0].length) {
          m.end -= shift;
        }
      }
    }
  };

  extract(/\\[(.*?)\\]\\((.*?)\\)/, "link", true);
  extract(/\\*\\*(.*?)\\*\\*/, "bold", false);
  extract(/\\*(.*?)\\*/, "italic", false);
  extract(/~~(.*?)~~/, "strike", false);
  extract(/`(.*?)`/, "code", false);

  return { marks: marks.length > 0 ? marks : undefined, text: clean };
}

/**
 * Converts raw markdown text into an array of structured blocks compatible with
 * the block-normalizer (and ultimately the TipTap editor).
 *
 * Supported conversions:
 * - `# Heading` → heading (level 1–6)
 * - Plain text   → paragraph
 * - `- item`     → list (unordered)
 * - `1. item`    → list (ordered)
 * - `- [ ] task` → todo (unchecked)
 * - `- [x] task` → todo (checked)
 * - `> quote`    → quote
 * - ```lang      → code (with optional language)
 * - `---`        → divider
 *
 * @param {string} markdown - Raw markdown content.
 * @returns {Array<{id: string, type: string, properties: object, children?: Array}>} Blocks array.
 */
function markdownToBlocks(markdown) {
  if (typeof markdown !== "string" || !markdown.trim()) {
    return [];
  }

  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ───────────────────────────────────────────
    const codeMatch = /^```(\w*)/.exec(line);
    if (codeMatch) {
      const language = codeMatch[1] || "";
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i++;
      }
      // Skip closing ```
      if (i < lines.length) i++;

      blocks.push({
        id: newBlockId(),
        properties: {
          attrs: { language },
          text: codeLines.join("\n"),
        },
        type: "code",
      });
      continue;
    }

    // ── Blank line (skip) ───────────────────────────────────────────
    if (!line.trim()) {
      i++;
      continue;
    }

    // ── Divider ─────────────────────────────────────────────────────
    if (/^-{3,}\s*$/.test(line) || /^\*{3,}\s*$/.test(line) || /^_{3,}\s*$/.test(line)) {
      blocks.push({
        id: newBlockId(),
        properties: {},
        type: "divider",
      });
      i++;
      continue;
    }

    // ── Heading ─────────────────────────────────────────────────────
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      blocks.push({
        id: newBlockId(),
        properties: {
          attrs: { level: headingMatch[1].length },
          ...extractMarks(headingMatch[2].trim()),
        },
        type: "heading",
      });
      i++;
      continue;
    }

    // ── Task list items (consecutive) ───────────────────────────────
    const taskMatch = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
    if (taskMatch) {
      // Collect consecutive task items
      while (i < lines.length) {
        const tm = /^[-*]\s+\[([ xX])\]\s+(.*)$/.exec(lines[i]);
        if (!tm) break;
        blocks.push({
          id: newBlockId(),
          properties: {
            attrs: { checked: tm[1].toLowerCase() === "x" },
            ...extractMarks(tm[2].trim()),
          },
          type: "todo",
        });
        i++;
      }
      continue;
    }

    // ── Unordered list (consecutive) ────────────────────────────────
    const bulletMatch = /^[-*+]\s+(.+)$/.exec(line);
    if (bulletMatch) {
      const children = [];
      while (i < lines.length) {
        const bm = /^[-*+]\s+(.+)$/.exec(lines[i]);
        if (!bm) break;
        children.push({
          id: newBlockId(),
          properties: { ...extractMarks(bm[1].trim()) },
          type: "paragraph",
        });
        i++;
      }
      blocks.push({
        children,
        id: newBlockId(),
        properties: {
          attrs: { ordered: false },
          text: children[0]?.properties?.text || "",
        },
        type: "list",
      });
      continue;
    }

    // ── Ordered list (consecutive) ──────────────────────────────────
    const orderedMatch = /^\d+[.)]\s+(.+)$/.exec(line);
    if (orderedMatch) {
      const children = [];
      while (i < lines.length) {
        const om = /^\d+[.)]\s+(.+)$/.exec(lines[i]);
        if (!om) break;
        children.push({
          id: newBlockId(),
          properties: { ...extractMarks(om[1].trim()) },
          type: "paragraph",
        });
        i++;
      }
      blocks.push({
        children,
        id: newBlockId(),
        properties: {
          attrs: { ordered: true },
          text: children[0]?.properties?.text || "",
        },
        type: "list",
      });
      continue;
    }

    // ── Blockquote (consecutive lines) ──────────────────────────────
    const quoteMatch = /^>\s*(.*)$/.exec(line);
    if (quoteMatch) {
      const quoteParts = [];
      while (i < lines.length) {
        const qm = /^>\s*(.*)$/.exec(lines[i]);
        if (!qm) break;
        quoteParts.push(qm[1].trim());
        i++;
      }
      blocks.push({
        id: newBlockId(),
        properties: { ...extractMarks(quoteParts.join("\n")) },
        type: "quote",
      });
      continue;
    }

    // ── Paragraph (default) ─────────────────────────────────────────
    blocks.push({
      id: newBlockId(),
      properties: { ...extractMarks(line.trim()) },
      type: "paragraph",
    });
    i++;
  }

  return blocks;
}

module.exports = { markdownToBlocks };
