/**
 * Valores dos enums PostgreSQL (`public.notes_status`, `public.project_status`).
 * Manter em sincronia com `server/db_structure_docs/new_structure_db.sql`.
 */
export const NOTE_STATUS = {
  ARCHIVED: "ARCHIVED",
  SECURE: "SECURE",
  VISIBLE: "VISIBLE",
} as const;

export type NoteStatus = (typeof NOTE_STATUS)[keyof typeof NOTE_STATUS];

export const PROJECT_STATUS = {
  ARCHIVED: "ARCHIVED",
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "IN_PROGRESS",
  OPEN: "OPEN",
  PAUSED: "PAUSED",
} as const;

export type ProjectStatus = (typeof PROJECT_STATUS)[keyof typeof PROJECT_STATUS];
