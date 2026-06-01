const { newBlockId } = require("@/modules/notes/block-normalizer");

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
        type: "code",
        properties: {
          text: codeLines.join("\n"),
          attrs: { language },
        },
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
        type: "divider",
        properties: {},
      });
      i++;
      continue;
    }

    // ── Heading ─────────────────────────────────────────────────────
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      blocks.push({
        id: newBlockId(),
        type: "heading",
        properties: {
          text: headingMatch[2].trim(),
          attrs: { level: headingMatch[1].length },
        },
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
          type: "todo",
          properties: {
            text: tm[2].trim(),
            attrs: { checked: tm[1].toLowerCase() === "x" },
          },
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
          type: "paragraph",
          properties: { text: bm[1].trim() },
        });
        i++;
      }
      blocks.push({
        id: newBlockId(),
        type: "list",
        properties: {
          text: children[0]?.properties?.text || "",
          attrs: { ordered: false },
        },
        children,
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
          type: "paragraph",
          properties: { text: om[1].trim() },
        });
        i++;
      }
      blocks.push({
        id: newBlockId(),
        type: "list",
        properties: {
          text: children[0]?.properties?.text || "",
          attrs: { ordered: true },
        },
        children,
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
        type: "quote",
        properties: { text: quoteParts.join("\n") },
      });
      continue;
    }

    // ── Paragraph (default) ─────────────────────────────────────────
    blocks.push({
      id: newBlockId(),
      type: "paragraph",
      properties: { text: line.trim() },
    });
    i++;
  }

  return blocks;
}

module.exports = { markdownToBlocks };
