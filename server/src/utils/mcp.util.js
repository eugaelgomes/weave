const { z } = require("zod");

/** UUID v1–v5 Zod Schema Validator */
const uuidSchema = z.string().uuid("Must be a valid UUID");

/** RFC 5321 Email Zod Schema Validator */
const emailSchema = z.string().email("Must be a valid email address");

/** Calendar event sync states Zod Schema Validator */
const syncStatusSchema = z.enum(["SYNCED", "PENDING", "FAILED", "OUT_OF_SYNC"]);

/** Maximum allowed character length for reasoning instructions payloads */
const MAX_INSTRUCTIONS_CHARS = 16000;

/**
 * Normalizes a reasoning instructions payload received from API clients.
 * Slices text up to 8000 characters per field to prevent memory exhaustion,
 * and validates that the overall length does not exceed maximum boundaries.
 *
 * @param {unknown} raw - The raw JSON payload from the request
 * @returns {{ global: { systemAppend: string, promptAppend: string }, byType: Record<string, { systemAppend: string, promptAppend: string }> }}
 * @throws {Error} if the combined length exceeds MAX_INSTRUCTIONS_CHARS
 */
function normalizeReasoningInstructions(raw) {
  const emptySlice = () => ({ promptAppend: "", systemAppend: "" });

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { byType: {}, global: emptySlice() };
  }

  const input = /** @type {Record<string, unknown>} */ (raw);

  const normalizeSlice = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return emptySlice();
    }
    const slice = /** @type {Record<string, unknown>} */ (value);
    return {
      promptAppend:
        typeof slice.promptAppend === "string" ? slice.promptAppend.trim().slice(0, 8000) : "",
      systemAppend:
        typeof slice.systemAppend === "string" ? slice.systemAppend.trim().slice(0, 8000) : "",
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
      `Reasoning instructions exceed the maximum length of ${MAX_INSTRUCTIONS_CHARS} characters`
    );
    err.statusCode = 400;
    throw err;
  }

  return { byType, global };
}

/**
 * Appends a custom instruction text block to a base prompt string safely.
 *
 * @param {string} base - The base prompt
 * @param {string} append - The text to append
 * @returns {string} The combined prompt string
 */
function appendInstructionBlock(base, append) {
  const trimmed = typeof append === "string" ? append.trim() : "";
  if (!trimmed) return base;
  return `${base}\n\n${trimmed}`;
}

/**
 * Resolves the effective prompt slices by merging global instructions
 * with specific type-bound instructions for a given report type.
 *
 * @param {object|null|undefined} instructions - The raw instructions payload
 * @param {string} reportType - The specific report type to resolve for
 * @returns {{ systemAppend: string, promptAppend: string }} The final resolved appends
 */
function resolveInstructionAppends(instructions, reportType) {
  const normalized = normalizeReasoningInstructions(instructions);
  const typeKey = String(reportType || "")
    .trim()
    .toLowerCase();
  const typeSlice = normalized.byType[typeKey] || {
    promptAppend: "",
    systemAppend: "",
  };

  return {
    promptAppend: [normalized.global.promptAppend, typeSlice.promptAppend]
      .filter(Boolean)
      .join("\n\n"),
    systemAppend: [normalized.global.systemAppend, typeSlice.systemAppend]
      .filter(Boolean)
      .join("\n\n"),
  };
}

module.exports = {
  appendInstructionBlock,
  emailSchema,
  MAX_INSTRUCTIONS_CHARS,
  normalizeReasoningInstructions,
  resolveInstructionAppends,
  syncStatusSchema,
  uuidSchema,
};
