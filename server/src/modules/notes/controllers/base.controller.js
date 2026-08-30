const baseRepository = require("@/modules/workspaces/repositories/base.repository");
const notesRepository = require("@/modules/notes/notes.repository");
const projectsRepository = require("@/modules/projects/repositories/projects.repository");

const {
  orgRoleHasPermission,
  ORG_PERMISSIONS,
} = require("@/modules/workspaces/workspace-role-policy");
const { AppError, fromUnknown, ERROR_CODES } = require("@/errors");
/**
 * Base of the notes controllers: authentication, access, and formatting.
 */
class NotesBaseController {
  constructor() {
    this.notesRepository = notesRepository;
  }

  _validateAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return null;
    }

    return userId;
  }

  _canAccessAllOrganizationProjects(membership) {
    if (!membership?.id) return false;
    return orgRoleHasPermission(membership.member_role, ORG_PERMISSIONS.ACCESS_ALL_ORG_PROJECTS);
  }

  /**
   * Note associated with a project of the active workspace and user with ACCESS_ALL_ORG_PROJECTS.
   * @param {Object} note - getNoteById row
   * @param {string} userId
   */
  async _hasOrgWideAccessToProjectNote(note, userId) {
    if (!note?.project_id) return false;
    const membership = await baseRepository.getActiveOrganizationWithMembership(userId);
    if (!this._canAccessAllOrganizationProjects(membership) || !membership.id) {
      return false;
    }
    const rows = await projectsRepository.getProjectByIdWithOrgScope(
      String(note.project_id),
      membership.id
    );
    return Boolean(rows?.length);
  }

  /** Active org when the user can see all notes of the projects of this org (via `project_id`). */
  async _getOrgWideNotesScopeOrganizationId(userId) {
    const membership = await baseRepository.getActiveOrganizationWithMembership(userId);
    if (this._canAccessAllOrganizationProjects(membership) && membership.id) {
      return membership.id;
    }
    return null;
  }

  /**
   * Validates and verifies note ownership or if is a collaborator
   * @param {string} noteId
   * @param {string} userId
   * @returns {Object}
   * @throws {Error}
   */
  async _validateNoteAccess(noteId, userId) {
    if (!noteId) {
      throw AppError.badRequest("Note ID is required");
    }

    const note = await this.notesRepository.getNoteById(noteId);

    if (!note) {
      throw AppError.notFound("Note not found", ERROR_CODES.NOTE_NOT_FOUND);
    }

    const isOwner = note.user_id === userId;

    const isCollaborator = await this.notesRepository.isCollaborator(noteId, userId);

    if (isOwner || isCollaborator) {
      return {
        hasOrgProjectAccess: false,
        isCollaborator,
        isOwner,
        note,
      };
    }

    const hasOrgProjectAccess = await this._hasOrgWideAccessToProjectNote(note, userId);
    if (hasOrgProjectAccess) {
      return {
        hasOrgProjectAccess: true,
        isCollaborator: false,
        isOwner: false,
        note,
      };
    }

    throw AppError.forbidden("Access denied");
  }

  /**
   * Optimized variant for high-frequency paths (block editing).
   * Avoids loading complete note payload when we only need to validate access.
   * @param {string} noteId
   * @param {string} userId
   * @returns {Promise<{ note: Object, isOwner: boolean, isCollaborator: boolean, hasOrgProjectAccess: boolean }>}
   */
  async _validateNoteAccessLightweight(noteId, userId) {
    if (!noteId) {
      throw AppError.badRequest("Note ID is required");
    }

    const note = await this.notesRepository.getNoteAccessSummary(noteId);
    if (!note) {
      throw AppError.notFound("Note not found", ERROR_CODES.NOTE_NOT_FOUND);
    }

    const isOwner = note.user_id === userId;
    if (isOwner) {
      return {
        hasOrgProjectAccess: false,
        isCollaborator: false,
        isOwner: true,
        note,
      };
    }

    const isCollaborator = await this.notesRepository.isCollaborator(noteId, userId);
    if (isCollaborator) {
      return {
        hasOrgProjectAccess: false,
        isCollaborator: true,
        isOwner: false,
        note,
      };
    }

    const hasOrgProjectAccess = await this._hasOrgWideAccessToProjectNote(note, userId);
    if (hasOrgProjectAccess) {
      return {
        hasOrgProjectAccess: true,
        isCollaborator: false,
        isOwner: false,
        note,
      };
    }

    throw AppError.forbidden("Access denied");
  }

  /**
   * Validates and verifies note ownership
   * @param {string} noteId
   * @param {string} userId
   * @returns {Object}
   * @throws {Error}
   */
  async _validateNoteOwnership(noteId, userId) {
    if (!noteId) {
      throw AppError.badRequest("Note ID is required");
    }

    const note = await this.notesRepository.getNoteById(noteId);

    if (!note) {
      throw AppError.notFound("Note not found", ERROR_CODES.NOTE_NOT_FOUND);
    }

    if (note.user_id === userId) {
      return note;
    }

    const hasOrgProjectAccess = await this._hasOrgWideAccessToProjectNote(note, userId);
    if (hasOrgProjectAccess) {
      return note;
    }

    throw AppError.forbidden("Access denied");
  }

  /**
   * Formats the standard response of a note
   * @param {Object} note
   * @param {Array} blocks
   * @returns {Object}
   */
  _formatNoteResponse(note, blocks = [], options = {}) {
    const { includeBlocks = true } = options;
    const projectId = note.project_id ? String(note.project_id) : null;
    return {
      associated_project: projectId
        ? {
            id: projectId,
            name: note.project_name || "",
            stage_id: note.project_stage_id ? String(note.project_stage_id) : null,
            stage_name: note.project_stage_name || null,
          }
        : null,
      blocks: includeBlocks && Array.isArray(blocks) ? blocks : [],
      created_at: note.created_at,
      description: note.description,
      due_date: note.due_date ?? null,
      id: note.id === undefined || note.id === null ? "" : String(note.id),
      priority_color: note.priority_color ?? null,
      priority_id: note.priority_id ?? null,
      priority_name: note.priority_name ?? null,
      properties: note.properties || {},
      public_id: note.public_note_id || null,
      revision:
        note.revision === undefined || note.revision === null ? null : Number(note.revision),
      status: note.status,
      tags: note.tags || [],
      title: note.title,
      updated_at: note.updated_at,
    };
  }

  /**
   * Handles specific errors and returns appropriate HTTP response
   * @param {Error} error
   * @param {Object} res
   * @param {Function} next
   */
  _handleError(error, res, next) {
    return next(fromUnknown(error));
  }
}

module.exports = NotesBaseController;
