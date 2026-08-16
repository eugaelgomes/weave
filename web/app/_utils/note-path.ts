import { routes } from "@/app/_utils/routes";

/**
 * Internal UUID for API mutations (never use route public_id segment).
 */
export function getNoteApiId(note: { id: string }): string {
  return note.id;
}

/**
 * Public note URL segment (12-char) or legacy UUID fallback.
 */
export function getNotePath(
  orgId: string,
  note: { public_id?: string | null; id: string }
): string {
  return routes.notes.details(orgId, note.public_id || note.id);
}

/**
 * Project-scoped task URL (alias); falls back to note path when public_id is missing.
 */
export function getProjectTaskPath(
  orgId: string,
  projectPublicId: string,
  note: { public_id?: string | null; id: string }
): string {
  if (note.public_id) {
    return routes.projects.task(orgId, projectPublicId, note.public_id);
  }
  return getNotePath(orgId, note);
}

/**
 * Updates browser URL for an open project task modal without a full navigation.
 */
export function syncProjectTaskUrl(
  orgId: string,
  projectPublicId: string | undefined,
  note: { public_id?: string | null; id: string } | null,
  clear: boolean
): void {
  if (typeof window === "undefined" || !projectPublicId) return;

  const projectBase = routes.projects.board(orgId, projectPublicId);

  if (clear) {
    if (window.location.pathname.includes("/tasks/")) {
      window.history.replaceState(null, "", projectBase);
    }
    return;
  }

  if (note?.public_id) {
    window.history.replaceState(null, "", getProjectTaskPath(orgId, projectPublicId, note));
  }
}

/**
 * Whether a loaded note matches the dynamic route segment (public id or UUID).
 */
export function isSameNoteRoute(
  note: { public_id?: string | null; id: string },
  routeNoteId: string
): boolean {
  if (!routeNoteId) return false;
  return note.id === routeNoteId || note.public_id === routeNoteId;
}
