/**
 * Using Object.freeze prevents these values from being accidentally mutated elsewhere.
 */

// --- PROJECTS (enum `public.project_status` in PostgreSQL) ---
const PROJECT_STATUS = Object.freeze({
  ARCHIVED: "ARCHIVED",
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
  OPEN: "OPEN",
  PAUSED: "PAUSED",
});

const PROJECT_FIELDS = Object.freeze({
  ALLOWED_PRIORITIES: ["low", "medium", "high", "critical"],
  DESCRIPTION_MAX_LENGTH: 500,
  TITLE_MAX_LENGTH: 100,
});

// --- NOTES (enum `public.notes_status` in PostgreSQL) ---
const NOTE_STATUS = Object.freeze({
  ARCHIVED: "ARCHIVED",
  SECURE: "SECURE",
  VISIBLE: "VISIBLE",
});

const NOTE_TYPES = Object.freeze({
  CHECKLIST: "checklist",
  CODE_SNIPPET: "code-snippet",
  TEXT: "text",
});

// --- BLOCKS (Content inside notes) ---
const BLOCK_TYPES = Object.freeze({
  CODE: "code",
  DIVIDER: "divider",
  HEADING: "heading",
  HEADING_1: "h1",
  HEADING_2: "h2",
  HEADING_3: "h3",
  IMAGE: "image",
  LIST: "list",
  PAGE: "page",
  PARAGRAPH: "paragraph",
  QUOTE: "quote",
  TEXT: "text",
  TODO: "todo",
});

const BLOCK_CONFIG = Object.freeze({
  ALLOW_HTML: false,
  MAX_DEPTH: 3,
});

// --- COLORS ---
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

const ALLOWED_COLOR_TYPES = Object.freeze({
  FORMAT: "hex",
  REGEX: HEX_COLOR_REGEX,
});

const ALLOWED_PROJECT_STATUSES = Object.values(PROJECT_STATUS);
const ALLOWED_NOTE_STATUSES = Object.values(NOTE_STATUS);
const ALLOWED_BLOCK_TYPES = Object.values(BLOCK_TYPES);

const LEGACY_PROJECT_STATUS = Object.freeze({
  ON_HOLD: "PAUSED",
  RUNNING: "IN_PROGRESS",
});

/**
 * Normalizes a note status to the `notes_status` enum value (uppercase).
 * Accepts legacy lowercase inputs (e.g., `visible` → `VISIBLE`).
 *
 * @param {unknown} input - The raw status input
 * @returns {string | null} The normalized status or null if invalid
 */
function normalizeNoteStatus(input) {
  if (input === undefined || input === null || input === "") {
    return NOTE_STATUS.VISIBLE;
  }
  const s = String(input).trim().toUpperCase().replace(/-/g, "_");
  return ALLOWED_NOTE_STATUSES.includes(s) ? s : null;
}

/**
 * Normalizes a project status to the `project_status` enum.
 * Accepts legacy values (`open`, `running`, `on-hold`, …).
 *
 * @param {unknown} input - The raw status input
 * @returns {string | null} The normalized status or null if invalid
 */
function normalizeProjectStatus(input) {
  if (input === undefined || input === null || input === "") {
    return PROJECT_STATUS.OPEN;
  }
  let s = String(input).trim().toUpperCase().replace(/-/g, "_");
  s = LEGACY_PROJECT_STATUS[s] || s;
  return ALLOWED_PROJECT_STATUSES.includes(s) ? s : null;
}

module.exports = {
  ALLOWED_BLOCK_TYPES,
  ALLOWED_COLOR_TYPES,
  ALLOWED_NOTE_STATUSES,
  ALLOWED_PROJECT_STATUSES,
  BLOCK_CONFIG,
  BLOCK_TYPES,
  HEX_COLOR_REGEX,
  normalizeNoteStatus,
  normalizeProjectStatus,
  NOTE_STATUS,
  NOTE_TYPES,
  PROJECT_FIELDS,
  PROJECT_STATUS,
};
