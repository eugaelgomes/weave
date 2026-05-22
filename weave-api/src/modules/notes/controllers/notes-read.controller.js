const NotesBaseController = require("./base.controller");

/**
 * Leitura: lista, detalhe e estatísticas.
 */
class NotesReadController extends NotesBaseController {
  async getAllNotes(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Parâmetros de query com valores padrão
      const {
        page = 1,
        limit = 10,
        search = "",
        tags = "",
        sortBy = "updated_at",
        sortOrder = "desc",
      } = req.query;

      //  Processar parâmetros de paginação e filtros
      const paginationOptions = {
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 10, 50),
        search: search.trim(),
        tags: tags
          ? tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        sortBy,
        sortOrder: sortOrder.toLowerCase(),
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
        blocks: [],
        id: note.id,
        public_id: note.public_note_id || null,
        title: note.title,
        description: note.description || null,
        properties: note.properties || {},
        tags: note.tags || [] || null,
        resolved_tags: Array.isArray(note.resolved_tags) ? note.resolved_tags : [],
        status: note.status || null,
        due_date: note.due_date ?? null,
        priority_id: note.priority_id ?? null,
        priority_name: note.priority_name ?? null,
        priority_color: note.priority_color ?? null,
        parent_id: note.parent_id ?? null,
        created_at: note.created_at,
        updated_at: note.updated_at,
        revision:
          note.revision === undefined || note.revision === null
            ? null
            : Number(note.revision),
        deleted: note.deleted,
        associated_project: note.project_id
          ? {
              id: note.project_id,
              name: note.project_name,
              stage_id: note.project_stage_id || null,
              stage_name: note.project_stage_name || null,
            }
          : null,
        associated_organization: note.org_id
          ? {
              id: note.org_id,
              name: note.org_name,
              unique_name: note.org_unique_name,
              logo_url: note.org_logo_url,
            }
          : null,
        author: {
          id: note.user_id,
          name: note.user_name,
          username: note.user_username,
          email: note.user_email,
          avatar_url: note.user_avatar_url,
        },
        collaborators: note.collaborators || [],
      }));

      if (result.pagination) {
        res.status(200).json({
          pagination: result.pagination,
          notes: notesWithBlocks,
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

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de acesso à nota (proprietário ou colaborador)
      const { note, isOwner, isCollaborator, hasOrgProjectAccess } =
        await this._validateNoteAccess(id, userId);

      const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
        String(note.id)
      );

      // Montar estrutura completa da nota
      const completeNote = {
        id: note.id,
        public_id: note.public_note_id || null,
        title: note.title,
        description: note.description || null,
        properties: note.properties || {},
        tags: note.tags || [] || null,
        status: note.status || null,
        due_date: note.due_date ?? null,
        priority_id: note.priority_id ?? null,
        priority_name: note.priority_name ?? null,
        priority_color: note.priority_color ?? null,
        created_at: note.created_at,
        updated_at: note.updated_at,
        revision:
          note.revision === undefined || note.revision === null
            ? null
            : Number(note.revision),
        deleted: note.deleted,
        associated_project: note.project_id
          ? {
              id: note.project_id,
              name: note.project_name,
              stage_id: note.project_stage_id || null,
              stage_name: note.project_stage_name || null,
            }
          : null,
        associated_organization: note.org_id
          ? {
              id: note.org_id,
              name: note.org_name,
              unique_name: note.org_unique_name,
              logo_url: note.org_logo_url,
            }
          : null,
        user: {
          id: note.user_id,
          name: note.user_name,
          username: note.user_username,
          email: note.user_email,
          avatar_url: note.user_avatar_url,
        },
        collaborators: note.collaborators || [],
        blocks,
        access: {
          isOwner,
          isCollaborator,
          hasOrgProjectAccess,
          canEdit: isOwner || isCollaborator || hasOrgProjectAccess,
          canDelete: isOwner || hasOrgProjectAccess,
          canShare: isOwner || hasOrgProjectAccess,
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
        totalNotes: parseInt(stats.total_notes) || 0,
        totalTags: parseInt(stats.unique_tags_count) || 0,
        statusDistribution: stats.status_distribution || {},
        mostUsedTags: (stats.top_tags || []).map((tag) => ({
          tag: tag.tag_name,
          count: parseInt(tag.count) || 0,
        })),
      };

      res.status(200).json(formattedStats);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesReadController();
