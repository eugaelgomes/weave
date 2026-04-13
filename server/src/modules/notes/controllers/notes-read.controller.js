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

      let result;

      if (
        req.query.page ||
        req.query.limit ||
        req.query.search ||
        req.query.tags
      ) {
        result = await this.notesRepository.getAllNotesWithPagination(
          userId,
          paginationOptions
        );
      } else {
        const notes = await this.notesRepository.getAllNotesFormatted(userId);
        result = { notes, pagination: null };
      }

      const notesWithBlocks = await Promise.all(
        result.notes.map(async (note) => {
          const blocks = await this.blocksRepository.getBlocksByNoteId(note.id);
          const blockTree = this.blocksRepository.buildBlockTree(blocks);

          return {
            id: note.id,
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
            blocks: blockTree,
          };
        })
      );

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
      const { note, isOwner, isCollaborator } = await this._validateNoteAccess(
        id,
        userId
      );

      // Buscar blocos da nota
      const blocks = await this.blocksRepository.getBlocksByNoteId(id);
      const blockTree = this.blocksRepository.buildBlockTree(blocks);

      // Montar estrutura completa da nota
      const completeNote = {
        id: note.id,
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
        blocks: blockTree,
        access: {
          isOwner,
          isCollaborator,
          canEdit: isOwner || isCollaborator,
          canDelete: isOwner,
          canShare: isOwner,
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

      const stats = await this.notesRepository.getAllNotesStats(userId);

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
