import { getEncoding } from "js-tiktoken";

/**
 * Singleton encoder instance to avoid recreation overhead
 */
let encoderInstance: ReturnType<typeof getEncoding> | null = null;

function getEncoder() {
  if (!encoderInstance) {
    // "cl100k_base" is the standard encoding for GPT-3.5/4 and generally good for modern LLMs
    encoderInstance = getEncoding("cl100k_base");
  }
  return encoderInstance;
}

/**
 * Estimates the number of tokens in a string.
 */
export function estimateTokens(text?: string): number {
  if (!text) return 0;
  try {
    const encoder = getEncoder();
    return encoder.encode(text).length;
  } catch (error) {
    console.error("Error estimating tokens:", error);
    // Fallback heuristic: 1 token ~= 4 chars
    return Math.ceil(text.length / 4);
  }
}

/**
 * Produces a compact plain-text preview from note document JSON.
 */
export function summarizeDocument(rawDocument: unknown): string {
  if (!rawDocument || typeof rawDocument !== "object") {
    return "";
  }

  const doc = rawDocument as { blocks?: unknown[] };
  const blocks = Array.isArray(doc.blocks) ? doc.blocks : [];
  if (blocks.length === 0) {
    return "";
  }

  const textParts: string[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") {
      continue;
    }
    const b = block as { text?: unknown };
    if (typeof b.text === "string" && b.text.trim().length > 0) {
      textParts.push(b.text.trim());
    }
    if (textParts.length >= 3) {
      break;
    }
  }

  if (textParts.length === 0) {
    return "";
  }

  const preview = textParts.join(" ").replace(/\s+/g, " ").trim();
  return preview.length > 280 ? `${preview.slice(0, 277)}...` : preview;
}

/**
 * Formats the server time.
 */
export function formatServerTime(date: Date = new Date()): string {
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const dayOfWeek = dayNames[date.getUTCDay()];
  const day = date.getUTCDate();
  const month = monthNames[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${dayOfWeek}, ${month} ${day}, ${year} ${hours}:${minutes} UTC (${date.toISOString()})`;
}

/**
 * Formats the role of a user, applying translations if necessary.
 */
export function formatRole(role?: string): string {
  if (role === "PROJECT_MANAGER") return "Manager";
  if (role === "PROJECT_MEMBER") return "Member";
  return role || "Unknown";
}
