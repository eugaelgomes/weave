const NotesBaseController = require("./base.controller");

/**
 * Read: list, detail, and statistics.
 */
class NotesReadController extends NotesBaseController {
  async getAllNotes(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Query parameters with default values
      const {
        page = 1,
        limit = 10,
        search = "",
        tags = "",
        sortBy = "updated_at",
        sortOrder = "desc",
      } = req.query;

      // Process pagination and filter parameters
      const paginationOptions = {
        limit: Math.min(parseInt(limit) || 10, 50),
        page: parseInt(page) || 1,
        search: search.trim(),
        sortBy,
        sortOrder: sortOrder.toLowerCase(),
        tags: tags
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
      };

      const orgWideOrganizationId =
        await this._getOrgWideNotesScopeOrganizationId(userId);

      let result;

      if (
        req.query.page ||
        req.query.limit ||
        req.query.search ||
        req.query.tags
      ) {
        result = await this.notesRepository.getAllNotesWithPagination(userId, {
          ...paginationOptions,
          orgWideOrganizationId,
        });
      } else {
        const notes = await this.notesRepository.getAllNotesFormatted(
          userId,
          orgWideOrganizationId
        );
        result = { notes, pagination: null };
      }

      const notesWithBlocks = result.notes.map((note) => ({
        associated_organization: note.org_id
          ? {
              id: note.org_id,
              logo_url: note.org_logo_url,
              name: note.org_name,
              unique_name: note.org_unique_name,
            }
          : null,
        associated_project: note.project_id
          ? {
              id: note.project_id,
              name: note.project_name,
              stage_color: note.project_stage_color || null,
              stage_id: note.project_stage_id || null,
              stage_name: note.project_stage_name || null,
            }
          : null,
        author: {
          avatar_url: note.user_avatar_url,
          email: note.user_email,
          id: note.user_id,
          name: note.user_name,
          username: note.user_username,
        },
        blocks: [],
        collaborators: note.collaborators || [],
        created_at: note.created_at,
        deleted: note.deleted,
        description: note.description || null,
        due_date: note.due_date ?? null,
        id: note.id,
        parent_id: note.parent_id ?? null,
        priority_color: note.priority_color ?? null,
        priority_id: note.priority_id ?? null,
        priority_name: note.priority_name ?? null,
        properties: note.properties || {},
        public_id: note.public_note_id || null,
        resolved_tags: Array.isArray(note.resolved_tags)
          ? note.resolved_tags
          : [],
        revision:
          note.revision === undefined || note.revision === null
            ? null
            : Number(note.revision),
        status: note.status || null,
        tags: note.tags || [] || null,
        title: note.title,
        updated_at: note.updated_at,
      }));

      if (result.pagination) {
        res.status(200).json({
          notes: notesWithBlocks,
          pagination: result.pagination,
        });
      } else {
        res.status(200).json({ notes: notesWithBlocks });
      }
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async getNoteById(req, res, next) {
    try {
      const { id } = req.params;

      // Authentication validation
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Note access validation (owner or collaborator)
      const { note, isOwner, isCollaborator, hasOrgProjectAccess } =
        await this._validateNoteAccess(id, userId);

      const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
        String(note.id)
      );

      // Assemble the complete note structure
      const completeNote = {
        access: {
          canDelete: isOwner || hasOrgProjectAccess,
          canEdit: isOwner || isCollaborator || hasOrgProjectAccess,
          canShare: isOwner || hasOrgProjectAccess,
          hasOrgProjectAccess,
          isCollaborator,
          isOwner,
        },
        associated_organization: note.org_id
          ? {
              id: note.org_id,
              logo_url: note.org_logo_url,
              name: note.org_name,
              unique_name: note.org_unique_name,
            }
          : null,
        associated_project: note.project_id
          ? {
              id: note.project_id,
              name: note.project_name,
              stage_color: note.project_stage_color || null,
              stage_id: note.project_stage_id || null,
              stage_name: note.project_stage_name || null,
            }
          : null,
        blocks,
        collaborators: note.collaborators || [],
        created_at: note.created_at,
        deleted: note.deleted,
        description: note.description || null,
        due_date: note.due_date ?? null,
        id: note.id,
        priority_color: note.priority_color ?? null,
        priority_id: note.priority_id ?? null,
        priority_name: note.priority_name ?? null,
        properties: note.properties || {},
        public_id: note.public_note_id || null,
        revision:
          note.revision === undefined || note.revision === null
            ? null
            : Number(note.revision),
        status: note.status || null,
        tags: note.tags || [] || null,
        title: note.title,
        updated_at: note.updated_at,
        user: {
          avatar_url: note.user_avatar_url,
          email: note.user_email,
          id: note.user_id,
          name: note.user_name,
          username: note.user_username,
        },
      };

      res.status(200).json(completeNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async getNotesStats(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const orgWideOrganizationId =
        await this._getOrgWideNotesScopeOrganizationId(userId);
      const stats = await this.notesRepository.getAllNotesStats(
        userId,
        orgWideOrganizationId
      );

      const formattedStats = {
        mostUsedTags: (stats.top_tags || []).map((tag) => ({
          count: parseInt(tag.count) || 0,
          tag: tag.tag_name,
        })),
        statusDistribution: stats.status_distribution || {},
        totalNotes: parseInt(stats.total_notes) || 0,
        totalTags: parseInt(stats.unique_tags_count) || 0,
      };

      res.status(200).json(formattedStats);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesReadController();
