/**
 * Helpers to derive a note title from plain text or from the first text-bearing block.
 * Used when the client leaves the title empty but provides body/description/blocks.
 */

const DEFAULT_MAX_TITLE_LEN = 200;

/**
 * @param {string} raw
 * @param {number} [maxLen]
 * @returns {string}
 */
function firstLineUpTo(raw, maxLen = DEFAULT_MAX_TITLE_LEN) {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const line = raw.replace(/\r\n/g, "\n").split("\n")[0]?.trim() ?? "";
  if (!line) return "";
  return line.length > maxLen ? line.slice(0, maxLen) : line;
}

/**
 * @param {unknown} node
 * @returns {string}
 */
function getBlockPlainText(node) {
  if (!node || typeof node !== "object") return "";
  const n = /** @type {Record<string, unknown>} */ (node);
  const fromTop = typeof n.text === "string" ? n.text : "";
  const props = n.properties;
  const fromProps =
    props &&
    typeof props === "object" &&
    props !== null &&
    typeof props.text === "string"
      ? props.text
      : "";
  return (fromTop || fromProps || "").replace(/\r\n/g, "\n");
}

/**
 * Depth-first: first non-whitespace text from any block (including nested children).
 * @param {unknown[]} blocks
 * @param {number} [maxLen]
 * @returns {string}
 */
function deriveTitleFromBlocks(blocks, maxLen = DEFAULT_MAX_TITLE_LEN) {
  if (!Array.isArray(blocks)) return "";

  const walk = (/** @type {unknown[]} */ list) => {
    for (const node of list) {
      const raw = getBlockPlainText(node);
      if (raw.trim()) return firstLineUpTo(raw, maxLen);
      const children =
        node && typeof node === "object" && node !== null && "children" in node
          ? /** @type {{ children?: unknown[] }} */ (node).children
          : undefined;
      if (Array.isArray(children) && children.length > 0) {
        const nested = walk(children);
        if (nested) return nested;
      }
    }
    return "";
  };

  return walk(blocks);
}

/**
 * @param {{ title?: unknown, description?: unknown, blocks?: unknown[] | null, plainFallback?: unknown }} input
 * @param {number} [maxLen]
 * @returns {string}
 */
function resolveNoteTitle(input, maxLen = DEFAULT_MAX_TITLE_LEN) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title) return title.length > maxLen ? title.slice(0, maxLen) : title;

  const description =
    typeof input.description === "string" ? input.description : "";
  const fromDesc = firstLineUpTo(description, maxLen);
  if (fromDesc) return fromDesc;

  const plain =
    typeof input.plainFallback === "string"
      ? firstLineUpTo(input.plainFallback, maxLen)
      : "";
  if (plain) return plain;

  const fromBlocks = deriveTitleFromBlocks(
    Array.isArray(input.blocks) ? input.blocks : [],
    maxLen
  );
  return fromBlocks;
}

module.exports = {
  DEFAULT_MAX_TITLE_LEN,
  firstLineUpTo,
  deriveTitleFromBlocks,
  resolveNoteTitle,
};
