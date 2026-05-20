const MAX_INSTRUCTIONS_CHARS = 16000;

/**
 * Normalizes reasoning instructions payload from API clients.
 * @param {unknown} raw
 * @returns {{ global: { systemAppend: string, promptAppend: string }, byType: Record<string, { systemAppend: string, promptAppend: string }> }}
 */
function normalizeReasoningInstructions(raw) {
  const emptySlice = () => ({ systemAppend: "", promptAppend: "" });

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { global: emptySlice(), byType: {} };
  }

  const input = /** @type {Record<string, unknown>} */ (raw);

  const normalizeSlice = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return emptySlice();
    }
    const slice = /** @type {Record<string, unknown>} */ (value);
    return {
      systemAppend:
        typeof slice.systemAppend === "string" ? slice.systemAppend.trim().slice(0, 8000) : "",
      promptAppend:
        typeof slice.promptAppend === "string" ? slice.promptAppend.trim().slice(0, 8000) : "",
    };
  };

  const global = normalizeSlice(input.global);
  const byType = {};

  if (input.byType && typeof input.byType === "object" && !Array.isArray(input.byType)) {
    for (const [key, value] of Object.entries(input.byType)) {
      const typeKey = String(key).trim().toLowerCase();
      if (!typeKey) continue;
      byType[typeKey] = normalizeSlice(value);
    }
  }

  const totalLength =
    global.systemAppend.length +
    global.promptAppend.length +
    Object.values(byType).reduce(
      (sum, slice) => sum + slice.systemAppend.length + slice.promptAppend.length,
      0
    );

  if (totalLength > MAX_INSTRUCTIONS_CHARS) {
    const err = new Error(
      `reasoning_instructions exceeds maximum length of ${MAX_INSTRUCTIONS_CHARS} characters`
    );
    err.statusCode = 400;
    throw err;
  }

  return { global, byType };
}

/**
 * Appends custom instruction text to a base string when non-empty.
 * @param {string} base
 * @param {string} append
 * @returns {string}
 */
function appendInstructionBlock(base, append) {
  const trimmed = typeof append === "string" ? append.trim() : "";
  if (!trimmed) return base;
  return `${base}\n\n${trimmed}`;
}

/**
 * Resolves effective append slices for a report type.
 * @param {object|null|undefined} instructions
 * @param {string} reportType
 * @returns {{ systemAppend: string, promptAppend: string }}
 */
function resolveInstructionAppends(instructions, reportType) {
  const normalized = normalizeReasoningInstructions(instructions);
  const typeKey = String(reportType || "").trim().toLowerCase();
  const typeSlice = normalized.byType[typeKey] || { systemAppend: "", promptAppend: "" };

  return {
    systemAppend: [normalized.global.systemAppend, typeSlice.systemAppend]
      .filter(Boolean)
      .join("\n\n"),
    promptAppend: [normalized.global.promptAppend, typeSlice.promptAppend]
      .filter(Boolean)
      .join("\n\n"),
  };
}

module.exports = {
  MAX_INSTRUCTIONS_CHARS,
  normalizeReasoningInstructions,
  appendInstructionBlock,
  resolveInstructionAppends,
};
