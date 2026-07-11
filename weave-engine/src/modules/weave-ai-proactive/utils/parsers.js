/**
 * @param {unknown} data
 * @returns {string}
 */
function extractText(data) {
  if (typeof data === "string") {
    return data.trim();
  }

  const text =
    data?.text ||
    data?.content ||
    (typeof data?.response === "string" ? data.response : "");

  return String(text || "").trim();
}

/**
 * @param {string} value
 * @returns {object|null}
 */
function safeJsonParse(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

/**
 * @param {string} content
 * @returns {string}
 */
function compactText(content) {
  return String(content || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

module.exports = {
  extractText,
  safeJsonParse,
  compactText,
};
