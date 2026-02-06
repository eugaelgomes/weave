const notesRepository = require("@/modules/notes/notes.repository");
const blocksRepository = require("@/modules/notes/blocks.repository");
const userRepository = require("@/modules/users/users.repository");
const { collabMail } = require("@/services/email/templates/notes/invite");
const {
  ALLOWED_NOTE_STATUSES,
} = require("@/services/patterns/product-patterns");
const { PDFService } = require("@/services/note_export/pdf");

const PlanUsageManager = require("@/modules/plans/plans.controller");
const PlansRepository = require("@/modules/plans/plans.repository");

class NotesController {
  constructor() {
    this.notesRepository = notesRepository;
    this.blocksRepository = blocksRepository;
    this.userRepository = userRepository;
  }

  /**
   * Validação de autenticação do usuário
   * @param {Object} req
   * @param {Object} res
   * @returns {Object|null}
   */
  _validateAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }

    return userId;
  }

  /**
   * Valida e verifica propriedade da nota ou se é colaborador
   * @param {string} noteId
   * @param {string} userId
   * @returns {Object}
   * @throws {Error}
   */
  async _validateNoteAccess(noteId, userId) {
    if (!noteId) {
      throw new Error("ID da nota é obrigatório");
    }

    const note = await this.notesRepository.getNoteById(noteId);

    if (!note) {
      throw new Error("Nota não encontrada");
    }

    const isOwner = note.user_id === userId;

    const isCollaborator = await this.notesRepository.isCollaborator(
      noteId,
      userId
    );

    if (!isOwner && !isCollaborator) {
      throw new Error("Acesso negado");
    }

    return { note, isOwner, isCollaborator };
  }

  /**
   * Valida e verifica propriedade da nota
   * @param {string} noteId
   * @param {string} userId
   * @returns {Object}
   * @throws {Error}
   */
  async _validateNoteOwnership(noteId, userId) {
    if (!noteId) {
      throw new Error("ID da nota é obrigatório");
    }

    const note = await this.notesRepository.getNoteById(noteId);

    if (!note) {
      throw new Error("Nota não encontrada");
    }

    if (note.user_id !== userId) {
      throw new Error("Acesso negado");
    }

    return note;
  }

  /**
   * Formata a resposta padrão de uma nota
   * @param {Object} note
   * @param {Array} blocks
   * @returns {Object}
   */
  _formatNoteResponse(note, blocks = []) {
    return {
      id: note.id.toString(),
      title: note.title,
      description: note.description,
      tags: note.tags || [],
      status: note.status,
      created_at: note.created_at,
      updated_at: note.updated_at,
      blocks: blocks,
    };
  }

  /**
   * Trata erros específicos e retorna resposta HTTP apropriada
   * @param {Error} error
   * @param {Object} res
   * @param {Function} next
   */
  _handleError(error, res, next) {
    const errorMessage = error.message;

    if (errorMessage.includes("obrigatório")) {
      return res.status(400).json({ error: errorMessage });
    }

    if (
      errorMessage.includes("não encontrada") ||
      errorMessage.includes("Acesso negado")
    ) {
      return res.status(404).json({ error: errorMessage });
    }

    next(error);
  }

  /**
   * GET /api/notes - Buscar todas as notas do usuário
   * Lista todas as notas pertencentes ao usuário autenticado
   *
   * PARÂMETROS DE QUERY SUPORTADOS:
   * - page: número da página (default: 1)
   * - limit: itens por página (default: 10)
   * - search: termo de busca no título e descrição
   * - tags: filtro por tags (separado por vírgula)
   * - sortBy: campo de ordenação (updated_at, created_at, title)
   * - sortOrder: ordem (asc, desc)
   *
   * EXEMPLO: GET /api/notes?page=2&limit=5&search=react&tags=frontend,tutorial&sortBy=title&sortOrder=asc
   */
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
            created_at: note.created_at,
            updated_at: note.updated_at,
            deleted: note.deleted,
            associated_project: note.project_id
              ? {
                  id: note.project_id,
                  name: note.project_name,
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

  /**
   * GET /api/notes/:id - Buscar uma nota específica
   * Retorna os detalhes de uma nota específica se pertencer ao usuário ou for colaborador
   */
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
        created_at: note.created_at,
        updated_at: note.updated_at,
        deleted: note.deleted,
        associated_project: note.project_id
          ? {
              id: note.project_id,
              name: note.project_name,
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

  /**
   * GET /api/notes/stats - Stats geral de notas
   */
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

  /**
   * POST /api/notes - Criar uma nova nota
   * Cria uma nova nota para o usuário autenticado
   */
  async createNote(req, res, next) {
    try {
      const { title, description, tags = [], status, project_id } = req.body;

      // 1. Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // 2. BUSCAR/CRIAR O REGISTRO DE USO (USANDO O MANAGER)
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // 3. BUSCAR DETALHES DO PLANO (LIMITES E NOME)
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // 4. VALIDAR LIMITE DE NOTAS
      const canCreate = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "usage_summary.notes_total",
        "limits.max_notes"
      );

      if (!canCreate) {
        return res.status(403).json({
          error: "Limite de notas atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${planDetails.details.limits.max_notes} notas.`,
        });
      }

      // 5. Validação de dados obrigatórios
      if (!title) {
        return res.status(400).json({
          error: "Título é obrigatório",
        });
      }

      const noteStatus =
        status === undefined || status === null ? "visible" : status;

      if (!ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
        });
      }

      // 6. Criação da nota no banco
      const newNote = await this.notesRepository.createNotesQuery(
        userId,
        title,
        description,
        tags,
        noteStatus,
        project_id
      );

      // 7. INCREMENTAR O USO
      await PlanUsageManager.consumeNoteCreation(usageRecord.id);

      // 8. Formata e retorna a nota criada
      const formattedNote = this._formatNoteResponse(newNote);
      res.status(201).json(formattedNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/notes/complete - Criar uma nota completa
   * Cria uma nova nota com bloco inicial para o usuário autenticado
   */
  async createCompleteNote(req, res, next) {
    try {
      const {
        title,
        description,
        tags = [],
        initialBlockContent = "",
        status,
        project_id,
      } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar/Criar registro de uso
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Buscar detalhes do plano
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // Validar limite de notas
      const canCreate = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "usage_summary.notes_total",
        "limits.max_notes"
      );

      if (!canCreate) {
        return res.status(403).json({
          error: "Limite de notas atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${planDetails.details.limits.max_notes} notas.`,
        });
      }

      // Validação de dados obrigatórios
      if (!title) {
        throw new Error("Título é obrigatório");
      }

      // Definir status padrão se não fornecido
      const noteStatus =
        status === undefined || status === null ? "visible" : status;

      // Validar status
      if (!ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
        });
      }

      // Criação da nota completa (nota + bloco inicial) em uma única transação
      const result = await this.notesRepository.createCompleteNote(
        userId,
        title,
        description,
        tags,
        initialBlockContent,
        noteStatus,
        project_id
      );

      // Incrementar o uso de notas
      await PlanUsageManager.consumeNoteCreation(usageRecord.id);

      // Montar estrutura completa da nota com todos os dados das tabelas relacionadas
      const completeNote = {
        id: result.note_id,
        user_id: result.user_id,
        project_id: result.project_id,
        title: result.title,
        description: result.description,
        tags: result.tags || [],
        status: result.status,
        created_at: result.note_created_at,
        updated_at: result.note_updated_at,
        user: {
          id: result.user_id,
          name: result.user_name,
          username: result.user_username,
          email: result.user_email,
          avatar_url: result.user_avatar_url,
        },
        blocks: [
          {
            id: result.block_id,
            note_id: result.note_id,
            user_id: result.user_id,
            parent_id: null,
            type: result.block_type,
            text: result.block_text,
            properties: result.block_properties,
            done: result.block_done,
            position: result.block_position,
            level: 0,
            created_at: result.block_created_at,
            updated_at: result.block_updated_at,
            children: [],
          },
        ],
      };

      // Retorna a nota completíssima criada
      res.status(201).json(completeNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/notes/:id - Atualizar uma nota
   * Atualiza título e descrição de uma nota existente
   */
  /**
   * PATCH /api/notes/:id - Atualizar uma nota
   * Atualiza os campos fornecidos de uma nota (atualização parcial)
   */
  async updateNote(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, tags, status, deleted, project_id } =
        req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de acesso à nota (proprietário ou colaborador pode editar)
      const { note, isOwner } = await this._validateNoteAccess(id, userId);

      // Apenas o proprietário pode marcar como deletado
      if (deleted !== undefined && !isOwner) {
        throw new Error("Apenas o proprietário pode excluir a nota");
      }

      // Validar status se fornecido
      if (status !== undefined && !ALLOWED_NOTE_STATUSES.includes(status)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
        });
      }

      // Prepara os dados para atualização (apenas campos fornecidos)
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (tags !== undefined) updateData.tags = tags;
      if (status !== undefined) updateData.status = status;
      if (deleted !== undefined) updateData.deleted = deleted;
      if (project_id !== undefined) updateData.project_id = project_id;

      // Verifica se há algo para atualizar
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "Nenhum campo fornecido para atualização",
        });
      }

      // Atualização da nota
      const updatedNote = await this.notesRepository.updateNoteById(
        id,
        updateData
      );

      if (!updatedNote) {
        return res.status(400).json({
          error: "Nenhuma atualização foi realizada",
        });
      }

      // Formata e retorna a nota atualizada
      const formattedNote = this._formatNoteResponse(updatedNote);
      res.status(200).json(formattedNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/notes/:id
   */
  async deleteNote(req, res, next) {
    try {
      const { id } = req.params;
      const { ids } = req.body;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const usageRecord = await PlanUsageManager.managePlanUsage(userId);

      let noteIds = [];

      if (ids && Array.isArray(ids) && ids.length > 0) {
        noteIds = ids;
      } else if (id) {
        noteIds = [id];
      } else {
        return res.status(400).json({ error: "Nenhum ID recebido." });
      }

      for (const noteId of noteIds) {
        await this._validateNoteOwnership(noteId, userId);
      }

      const affectedRows = await this.notesRepository.deleteNoteById(noteIds);

      if (usageRecord) {
        await PlanUsageManager.decrementNoteUsage(usageRecord.id, affectedRows);
      }

      return res.status(200).json({
        message:
          affectedRows > 1
            ? `${affectedRows} notas deletadas com sucesso`
            : "Nota deletada com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/notes/:id/blocks - Criar um novo bloco
   * Adiciona um novo bloco à nota especificada
   */
  async createBlock(req, res, next) {
    try {
      const { id: noteId } = req.params;
      const { type, text, properties, done, parentId, position } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e o usuário tem acesso (proprietário ou colaborador)
      await this._validateNoteAccess(noteId, userId);

      // Validação de dados obrigatórios
      if (!type) {
        throw new Error("Tipo do bloco é obrigatório");
      }

      // Validar tipos permitidos
      const {
        ALLOWED_BLOCK_TYPES,
      } = require("@/services/patterns/product-patterns");
      if (!ALLOWED_BLOCK_TYPES.includes(type)) {
        throw new Error(
          `Tipo inválido. Tipos permitidos: ${ALLOWED_BLOCK_TYPES.join(", ")}`
        );
      }

      // Criar o bloco
      const newBlock = await this.blocksRepository.createBlock({
        noteId,
        userId,
        parentId,
        type,
        text,
        properties: properties || {},
        done: type === "todo" ? done : undefined,
        position,
      });

      res.status(201).json(newBlock);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/notes/:noteId/blocks/:blockId - Atualizar um bloco
   * Atualiza um bloco existente da nota
   */
  async updateBlock(req, res, next) {
    try {
      const { noteId, blockId } = req.params;
      const updateData = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e o usuário tem acesso (proprietário ou colaborador)
      await this._validateNoteAccess(noteId, userId);

      // Verificar se o bloco existe e pertence à nota
      const existingBlock = await this.blocksRepository.getBlockById(blockId);
      if (!existingBlock || existingBlock.note_id !== noteId) {
        throw new Error("Bloco não encontrado ou não pertence a esta nota");
      }

      // Atualizar o bloco
      const updatedBlock = await this.blocksRepository.updateBlock(
        blockId,
        updateData
      );

      res.status(200).json(updatedBlock);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/notes/:noteId/blocks/:blockId - Deletar um bloco
   * Remove um bloco da nota (soft delete)
   */
  async deleteBlock(req, res, next) {
    try {
      const { noteId, blockId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e o usuário tem acesso (proprietário ou colaborador)
      await this._validateNoteAccess(noteId, userId);

      // Verificar se o bloco existe e pertence à nota
      const existingBlock = await this.blocksRepository.getBlockById(blockId);
      if (!existingBlock || existingBlock.note_id !== noteId) {
        throw new Error("Bloco não encontrado ou não pertence a esta nota");
      }

      // Deletar o bloco
      await this.blocksRepository.deleteBlock(blockId);

      res.status(200).json({
        message: "Bloco deletado com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/notes/:noteId/blocks/reorder - Reordenar blocos
   * Atualiza as posições de múltiplos blocos
   */
  async reorderBlocks(req, res, next) {
    try {
      const { noteId } = req.params;
      const { blocks: blockPositions } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e o usuário tem acesso (proprietário ou colaborador)
      await this._validateNoteAccess(noteId, userId);

      // Validação dos dados
      if (!Array.isArray(blockPositions) || blockPositions.length === 0) {
        throw new Error("Lista de blocos é obrigatória");
      }

      // Validar formato dos dados
      for (const block of blockPositions) {
        if (!block.id || typeof block.position !== "number") {
          throw new Error("Cada bloco deve ter 'id' e 'position'");
        }
      }

      // Reordenar blocos
      await this.blocksRepository.reorderBlocks(blockPositions);

      res.status(200).json({
        message: "Blocos reordenados com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/notes/:noteId/blocks - Buscar blocos de uma nota
   * Retorna todos os blocos organizados hierarquicamente
   */
  async getBlocksByNote(req, res, next) {
    try {
      const { noteId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e o usuário tem acesso (proprietário ou colaborador)
      await this._validateNoteAccess(noteId, userId);

      // Buscar blocos da nota
      const blocks = await this.blocksRepository.getBlocksByNoteId(noteId);
      const blockTree = this.blocksRepository.buildBlockTree(blocks);

      res.status(200).json({
        blocks: blockTree,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * POST /api/notes/:noteId/collaborators - Adicionar colaborador
   * Adiciona um usuário como colaborador da nota
   */
  async addCollaborator(req, res, next) {
    try {
      const { noteId } = req.params;
      const { userId: collaboratorId } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar/Criar registro de uso
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Buscar detalhes do plano
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // Validar limite de colaboradores por nota
      const currentCollaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);
      const maxCollaborators =
        planDetails.details?.limits?.max_collaborators_per_note;

      if (maxCollaborators && currentCollaborators.length >= maxCollaborators) {
        return res.status(403).json({
          error: "Limite de colaboradores atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${maxCollaborators} colaboradores por nota.`,
        });
      }

      // Verificar se a nota existe e pertence ao usuário
      await this._validateNoteOwnership(noteId, userId);

      // Validação de dados obrigatórios
      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      // Verificar se o usuário não está tentando adicionar a si mesmo
      if (collaboratorId === userId) {
        throw new Error("Você não pode adicionar a si mesmo como colaborador");
      }

      // Verificar se o colaborador já está ativo
      const isAlreadyCollaborator = await this.notesRepository.isCollaborator(
        noteId,
        collaboratorId
      );

      if (isAlreadyCollaborator) {
        throw new Error("Usuário já é colaborador desta nota");
      }

      // Adicionar ou reativar colaborador
      const result = await this.notesRepository.addCollaborator(
        noteId,
        collaboratorId
      );

      if (!result) {
        throw new Error("Usuário já é colaborador desta nota");
      }

      // Buscar dados do colaborador adicionado e da nota
      const collaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);
      const newCollaborator = collaborators.find(
        (c) => c.user_id === collaboratorId
      );

      // Buscar dados completos do colaborador para o email
      const collaboratorData =
        await this.userRepository.findById(collaboratorId);
      const ownerData = await this.userRepository.findById(userId);
      const noteData = await this.notesRepository.getNoteById(noteId);

      // Enviar email de notificação (não bloquear a resposta se falhar)
      if (collaboratorData && ownerData && noteData) {
        try {
          collabMail(
            collaboratorData.email,
            collaboratorData.name,
            noteData.title,
            ownerData.name,
            noteId
          );
        } catch (emailError) {
          console.error(
            "Erro ao enviar email de colaboração:",
            emailError.message
          );
          // Não falhamos a operação por causa do email
        }
      }

      res.status(201).json({
        message: "Colaborador adicionado com sucesso",
        collaborator: newCollaborator,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/notes/:noteId/collaborators/:collaboratorId - Remover colaborador
   * Remove um colaborador da nota
   */
  async removeCollaborator(req, res, next) {
    try {
      const { noteId, collaboratorId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e pertence ao usuário
      await this._validateNoteOwnership(noteId, userId);

      // Verificar se o colaborador existe na nota
      const isCollaborator = await this.notesRepository.isCollaborator(
        noteId,
        collaboratorId
      );

      if (!isCollaborator) {
        throw new Error("Usuário não é colaborador desta nota");
      }

      // Remover colaborador
      const result = await this.notesRepository.removeCollaborator(
        noteId,
        collaboratorId
      );

      if (result.rowCount === 0) {
        throw new Error("Falha ao remover colaborador");
      }

      res.status(200).json({
        message: "Colaborador removido com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/notes/:noteId/recuseCollaboration - Recusar colaboração
   * Permite que um colaborador remova a si mesmo de uma nota compartilhada
   */
  async recuseCollaboration(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Impedir que o dono recuse a própria nota
      //await this._validateNotOwner(noteId, userId);

      const result = await this.notesRepository.recuseCollaboration(
        noteId,
        userId
      );

      if (result.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Você já recusou ou não era colaborador desta nota",
        });
      }

      res.status(200).json({
        success: true,
        message: "Você não é mais colaborador desta nota",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/notes/:noteId/collaborators - Listar colaboradores
   * Lista todos os colaboradores de uma nota
   */
  async getCollaborators(req, res, next) {
    try {
      const { noteId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e o usuário tem acesso (proprietário ou colaborador pode ver)
      await this._validateNoteAccess(noteId, userId);

      // Buscar colaboradores pelo /:id da nota
      const collaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);

      if (collaborators.length === 0) {
        return res.status(200).json({
          collaborators: [],
          message: "Nenhum colaborador encontrado.",
        });
      } else {
        res.status(200).json({
          collaborators,
        });
      }
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async exportNoteAsPDF(req, res, next) {
    try {
      const { noteId } = req.params; // Nas rotas você definiu como /:id/export/pdf

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar/Criar registro de uso
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Buscar detalhes do plano
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // Validar limite de exportações mensais
      const canExport = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "monthly_cycle.exports.notes_count",
        "limits.exports.notes_monthly"
      );

      if (!canExport) {
        return res.status(403).json({
          error: "Limite de exportações atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${planDetails.details.limits.exports.notes_monthly} exportações de notas por mês.`,
        });
      }

      const { note } = await this._validateNoteAccess(noteId, userId);

      if (!note) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      const blocks = await this.blocksRepository.getBlocksByNoteId(noteId);
      const blockTree = this.blocksRepository.buildBlockTree(blocks);

      const dataForPDF = {
        ...note,
        blocks: blockTree,
        collaborators: note.collaborators || [],
        user_name: note.user_name,
        user_email: note.user_email,
      };

      const pdfBuffer = await PDFService.generateNotePDF(dataForPDF);

      // Incrementar contador de exportações
      await PlanUsageManager.consumeExport(usageRecord.id, "notes");

      const filename = `nota-${noteId}-${new Date().getTime()}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      return res.status(200).send(pdfBuffer);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesController();
