/**
 * Markdown → HTML converter for emails
 *
 * Lightweight converter focused on the output patterns of our serializer.
 * Uses inline styles for email client compatibility (no external CSS).
 * No external dependencies (marked, etc.).
 */

const COLOR_TEXT = "#111827";
const COLOR_MUTED = "#6B7280";
const COLOR_BORDER = "#E5E7EB";
const COLOR_CODE_BG = "#F3F4F6";
const COLOR_QUOTE_BORDER = "#EAB308";

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Process inline markdown formatting (bold, italic, code, links, etc.)
 *
 * @param {string} line
 * @returns {string}
 */
function processInline(line) {
  let result = escapeHtml(line);

  // Bold: **text**
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *text*
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Strikethrough: ~~text~~
  result = result.replace(
    /~~(.+?)~~/g,
    '<span style="text-decoration: line-through;">$1</span>'
  );

  // Inline code: `text`
  result = result.replace(
    /`([^`]+)`/g,
    `<code style="background: ${COLOR_CODE_BG}; padding: 2px 6px; border-radius: 4px; font-size: 13px;">$1</code>`
  );

  // Links: [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" style="color: ${COLOR_TEXT}; text-decoration: underline;">$1</a>`
  );

  // Highlight: ==text==
  result = result.replace(
    /==(.+?)==/g,
    '<mark style="background: #FEF3C7; padding: 1px 3px; border-radius: 2px;">$1</mark>'
  );

  // Underline: <u>text</u> (already HTML, just unescape)
  result = result.replace(
    /&lt;u&gt;(.+?)&lt;\/u&gt;/g,
    "<u>$1</u>"
  );

  return result;
}

/**
 * Convert markdown string to email-safe HTML.
 *
 * @param {string} markdown
 * @returns {string}
 */
function markdownToHtml(markdown) {
  if (!markdown || typeof markdown !== "string") {
    return "";
  }

  const lines = markdown.split("\n");
  const htmlParts = [];
  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = "";
  let inList = false;
  let listItems = [];
  let listOrdered = false;

  const flushList = () => {
    if (!inList || listItems.length === 0) return;
    const tag = listOrdered ? "ol" : "ul";
    htmlParts.push(
      `<${tag} style="margin: 8px 0 8px 20px; padding: 0; color: ${COLOR_TEXT};">`
    );
    for (const item of listItems) {
      htmlParts.push(
        `<li style="margin: 4px 0; font-size: 14px; line-height: 1.6;">${item}</li>`
      );
    }
    htmlParts.push(`</${tag}>`);
    listItems = [];
    inList = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      if (!inCodeBlock) {
        flushList();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
        codeBlockContent = [];
        continue;
      } else {
        // Close code block
        htmlParts.push(
          `<pre style="background: ${COLOR_CODE_BG}; border: 1px solid ${COLOR_BORDER}; border-radius: 8px; padding: 14px 16px; margin: 12px 0; overflow-x: auto;"><code style="font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.5; color: ${COLOR_TEXT};">${escapeHtml(codeBlockContent.join("\n"))}</code></pre>`
        );
        inCodeBlock = false;
        continue;
      }
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // YAML frontmatter (skip)
    if (trimmed === "---") {
      flushList();
      // Check if it's a frontmatter block
      if (i === 0 || (i > 0 && lines[i - 1].trim() === "")) {
        // Skip until closing ---
        let j = i + 1;
        while (j < lines.length && lines[j].trim() !== "---") {
          j++;
        }
        i = j; // Skip past closing ---
        continue;
      }
      // Regular divider
      htmlParts.push(
        `<hr style="border: none; border-top: 1px solid ${COLOR_BORDER}; margin: 16px 0;" />`
      );
      continue;
    }

    // Headings: # to ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text = processInline(headingMatch[2]);
      const sizes = {
        1: "22px",
        2: "18px",
        3: "16px",
        4: "15px",
        5: "14px",
        6: "13px",
      };
      htmlParts.push(
        `<h${level} style="margin: 16px 0 8px; font-size: ${sizes[level]}; font-weight: 700; color: ${COLOR_TEXT}; line-height: 1.4;">${text}</h${level}>`
      );
      continue;
    }

    // Blockquote: > text
    if (trimmed.startsWith("> ") || trimmed === ">") {
      flushList();
      const quoteText = processInline(trimmed.slice(2));
      htmlParts.push(
        `<div style="margin: 8px 0; padding: 8px 14px; border-left: 3px solid ${COLOR_QUOTE_BORDER}; background: #FFFBEB; border-radius: 0 6px 6px 0;"><p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${COLOR_MUTED}; font-style: italic;">${quoteText}</p></div>`
      );
      continue;
    }

    // Todo items: - [x] or - [ ]
    const todoMatch = trimmed.match(/^-\s+\[([ xX])\]\s*(.*)/);
    if (todoMatch) {
      if (!inList) {
        flushList();
        inList = true;
        listOrdered = false;
      }
      const checked = todoMatch[1].toLowerCase() === "x";
      const text = processInline(todoMatch[2]);
      const emoji = checked ? "✅" : "⬜";
      const decoration = checked
        ? "text-decoration: line-through; color: " + COLOR_MUTED
        : "color: " + COLOR_TEXT;
      listItems.push(
        `${emoji} <span style="${decoration}; font-size: 14px;">${text}</span>`
      );
      continue;
    }

    // Unordered list: - item
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (!inList) {
        flushList();
        inList = true;
        listOrdered = false;
      }
      listItems.push(processInline(ulMatch[1]));
      continue;
    }

    // Ordered list: 1. item
    const olMatch = trimmed.match(/^\d+\.\s+(.*)/);
    if (olMatch) {
      if (!inList) {
        flushList();
        inList = true;
        listOrdered = true;
      }
      listItems.push(processInline(olMatch[1]));
      continue;
    }

    // Image: ![alt](src) — skip for emails
    if (trimmed.startsWith("![")) {
      flushList();
      const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (imgMatch) {
        htmlParts.push(
          `<p style="margin: 8px 0; font-size: 13px; color: ${COLOR_MUTED};">[Image: ${escapeHtml(imgMatch[1] || "attachment")}]</p>`
        );
      }
      continue;
    }

    // Comment / page break
    if (trimmed.startsWith("<!--")) {
      continue;
    }

    // Default paragraph
    flushList();
    htmlParts.push(
      `<p style="margin: 8px 0; font-size: 14px; line-height: 1.7; color: ${COLOR_TEXT};">${processInline(trimmed)}</p>`
    );
  }

  flushList();

  return htmlParts.join("\n");
}

module.exports = { markdownToHtml, escapeHtml, processInline };
