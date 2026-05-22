/**
 * Plain-text extraction from note_blocks rows for embeddings and search indexing.
 */

const MAX_EMBEDDING_TEXT_CHARS = 8000;

/**
 * @param {Array<{ properties?: object | string, type?: string }>} rows
 * @returns {string}
 */
function extractPlainTextFromBlockRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return "";

  const lines = [];
  for (const row of rows) {
    let props = row.properties;
    if (typeof props === "string") {
      try {
        props = JSON.parse(props);
      } catch {
        props = {};
      }
    }
    if (!props || typeof props !== "object") props = {};

    const text = typeof props.text === "string" ? props.text.trim() : "";
    if (!text) continue;

    if (row.type === "heading") {
      const level = Math.min(Math.max(Number(props.attrs?.level) || 1, 1), 6);
      lines.push(`${"#".repeat(level)} ${text}`);
    } else if (row.type === "todo") {
      const checked = props.attrs?.checked === true;
      lines.push(`- [${checked ? "x" : " "}] ${text}`);
    } else {
      lines.push(text);
    }
  }

  return lines.join("\n").slice(0, MAX_EMBEDDING_TEXT_CHARS);
}

module.exports = {
  MAX_EMBEDDING_TEXT_CHARS,
  extractPlainTextFromBlockRows,
};
