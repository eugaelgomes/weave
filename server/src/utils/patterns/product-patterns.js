// Usar Object.freeze impede que você altere esses valores acidentalmente em outro lugar

// --- PROJECTS (enum `public.project_status` no PostgreSQL) ---
export const PROJECT_STATUS = Object.freeze({
  ARCHIVED: "ARCHIVED",
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
  OPEN: "OPEN",
  PAUSED: "PAUSED",
});

export const PROJECT_FIELDS = Object.freeze({
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ALLOWED_PRIORITIES: ["low", "medium", "high", "critical"],
});

// --- NOTES (enum `public.notes_status` no PostgreSQL) ---
export const NOTE_STATUS = Object.freeze({
  ARCHIVED: "ARCHIVED",
  SECURE: "SECURE",
  VISIBLE: "VISIBLE",
});

export const NOTE_TYPES = Object.freeze({
  TEXT: "text",
  CHECKLIST: "checklist",
  CODE_SNIPPET: "code-snippet",
});

// --- BLOCKS (Conteúdo dentro das notas) ---
export const BLOCK_TYPES = Object.freeze({
  TEXT: "text",
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  HEADING_1: "h1",
  HEADING_2: "h2",
  HEADING_3: "h3",
  TODO: "todo",
  LIST: "list",
  PAGE: "page",
  CODE: "code",
  QUOTE: "quote",
  IMAGE: "image",
  DIVIDER: "divider",
});

export const BLOCK_CONFIG = Object.freeze({
  MAX_DEPTH: 3,
  ALLOW_HTML: false,
});

// --- COLORS ---
export const HEX_COLOR_REGEX =
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

export const ALLOWED_COLOR_TYPES = Object.freeze({
  FORMAT: "hex",
  REGEX: HEX_COLOR_REGEX,
});

export const ALLOWED_PROJECT_STATUSES = Object.values(PROJECT_STATUS);
export const ALLOWED_NOTE_STATUSES = Object.values(NOTE_STATUS);
export const ALLOWED_BLOCK_TYPES = Object.values(BLOCK_TYPES);

const LEGACY_PROJECT_STATUS = Object.freeze({
  ON_HOLD: "PAUSED",
  RUNNING: "IN_PROGRESS",
});

/**
 * Normaliza status de nota para o valor do enum `notes_status` (maiúsculas).
 * Aceita legado em minúsculas (`visible` → `VISIBLE`).
 * @param {unknown} input
 * @returns {string | null}
 */
export function normalizeNoteStatus(input) {
  if (input === undefined || input === null || input === "") {
    return NOTE_STATUS.VISIBLE;
  }
  const s = String(input).trim().toUpperCase().replace(/-/g, "_");
  return ALLOWED_NOTE_STATUSES.includes(s) ? s : null;
}

/**
 * Normaliza status de projeto para o enum `project_status`.
 * Aceita legado (`open`, `running`, `on-hold`, …).
 * @param {unknown} input
 * @returns {string | null}
 */
export function normalizeProjectStatus(input) {
  if (input === undefined || input === null || input === "") {
    return PROJECT_STATUS.OPEN;
  }
  let s = String(input).trim().toUpperCase().replace(/-/g, "_");
  s = LEGACY_PROJECT_STATUS[s] || s;
  return ALLOWED_PROJECT_STATUSES.includes(s) ? s : null;
}
