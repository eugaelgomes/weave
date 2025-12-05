const notesRepository = require("@/repositories/notes-manager");
const blocksRepository = require("@/repositories/blocks-manager");
const userRepository = require("@/repositories/user-manager");
const {
  sendCollaborationNotification,
} = require("@/services/email/templates/notes-mails/collab-notification");
const { ALLOWED_NOTE_STATUSES } = require("../product-patterns");

class NotesController {
  constructor() {
    this.notesRepository = notesRepository;
    this.blocksRepository = blocksRepository;
    this.userRepository = userRepository;
  }

  // ========================================
  // MÉTODOS UTILITÁRIOS E VALIDAÇÃO
  // ========================================

  /**
   * Valida se o usuário está autenticado
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object|null} - Retorna o userId se válido, ou envia erro HTTP
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
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário
   * @returns {Object} - Nota encontrada
   * @throws {Error} - Se nota não existir ou usuário não ter acesso
   */
  async _validateNoteAccess(noteId, userId) {
    if (!noteId) {
      throw new Error("ID da nota é obrigatório");
    }

    const note = await this.notesRepository.getNoteById(noteId);

    if (!note) {
      throw new Error("Nota não encontrada");
    }

    // Verifica se é o dono da nota
    const isOwner = note.user_id === userId;

    // Verifica se é colaborador
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
   * @param {string} noteId - ID da nota
   * @param {string} userId - ID do usuário
   * @returns {Object} - Nota encontrada
   * @throws {Error} - Se nota não existir ou não pertencer ao usuário
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
   * @param {Object} note - Dados da nota do banco
   * @param {Array} blocks - Blocos da nota (opcional)
   * @returns {Object} - Nota formatada
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
      blocks: blocks, // Nova estrutura de blocos hierárquicos
    };
  }

  /**
   * Trata erros específicos e retorna resposta HTTP apropriada
   * @param {Error} error - Erro capturado
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  _handleError(error, res, next) {
    const errorMessage = error.message;

    // Erros de validação (400 Bad Request)
    if (errorMessage.includes("obrigatório")) {
      return res.status(400).json({ error: errorMessage });
    }

    // Erros de autorização e não encontrado (404 Not Found)
    if (
      errorMessage.includes("não encontrada") ||
      errorMessage.includes("Acesso negado")
    ) {
      return res.status(404).json({ error: errorMessage });
    }

    // Outros erros passam para o middleware de erro global
    next(error);
  }

  // ========================================
  // ENDPOINTS DA API
  // ========================================

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
      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // EXTRAÇÃO DOS PARÂMETROS DE QUERY
      const {
        page = 1,
        limit = 10,
        search = "",
        tags = "",
        sortBy = "updated_at",
        sortOrder = "desc",
      } = req.query;

      // PROCESSAMENTO DOS PARÂMETROS
      const paginationOptions = {
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 10, 50), // Máximo 50 itens por página
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

      // BUSCA COM PAGINAÇÃO OU SEM (para compatibilidade)
      let result;

      // SE TEM PARÂMETROS DE PAGINAÇÃO, usa o método paginado
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
        // MODO COMPATIBILIDADE: retorna todas as notas como antes
        const notes = await this.notesRepository.getAllNotesFormatted(userId);
        result = { notes, pagination: null };
      }

      // PROCESSAMENTO DOS BLOCOS (mesmo lógica anterior)
      const notesWithBlocks = await Promise.all(
        result.notes.map(async (note) => {
          const blocks = await this.blocksRepository.getBlocksByNoteId(note.id);
          const blockTree = this.blocksRepository.buildBlockTree(blocks);

          return {
            id: note.id,
            title: note.title,
            description: note.description,
            tags: note.tags || [],
            status: note.status,
            created_at: note.created_at,
            updated_at: note.updated_at,
            deleted: note.deleted,
            author: {
              id: note.user_id,
              username: note.user_username,
              avatar_url: note.user_avatar_url,
            },
            collaborators: note.collaborators || [],
            blocks: blockTree,
          };
        })
      );

      // RESPOSTA COM OU SEM PAGINAÇÃO
      if (result.pagination) {
        // RESPOSTA COM PAGINAÇÃO
        res.status(200).json({
          notes: notesWithBlocks,
          pagination: result.pagination,
        });
      } else {
        // RESPOSTA ORIGINAL (compatibilidade)
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
        user_id: note.user_id,
        title: note.title,
        description: note.description,
        tags: note.tags || [],
        status: note.status || "sem_status",
        created_at: note.created_at,
        updated_at: note.updated_at,
        user: {
          id: note.user_id,
          name: note.user_name,
          username: note.user_username,
          email: note.user_email,
          avatar_url: note.user_avatar_url,
        },
        collaborators: note.collaborators || [],
        blocks: blockTree,
        // Metadados de acesso
        access: {
          isOwner,
          isCollaborator,
          canEdit: isOwner || isCollaborator, // Dono e colaboradores podem editar
          canDelete: isOwner, // Apenas o dono pode excluir
          canShare: isOwner, // Apenas o dono pode compartilhar
        },
      };

      // Retorna a nota completa
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
      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar estatísticas
      const stats = await this.notesRepository.getAllNotesStats(userId);

      // Formatar dados para o frontend
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
      const { title, description, tags = [], status } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de dados obrigatórios
      if (!title) {
        throw new Error("Título é obrigatório");
      }

      // Definir status padrão se não fornecido
      const noteStatus = status === undefined || status === null ? "open" : status;
      
      // Validar status
      if (!ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
        });
      }

      // Criação da nota
      const newNote = await this.notesRepository.createNotesQuerie(
        userId,
        title,
        description,
        tags,
        noteStatus
      );

      // Formata e retorna a nota criada
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
      } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de dados obrigatórios
      if (!title) {
        throw new Error("Título é obrigatório");
      }

      // Definir status padrão se não fornecido
      const noteStatus = status === undefined || status === null ? "open" : status;
      
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
        noteStatus
      );

      // Montar estrutura completa da nota com todos os dados das tabelas relacionadas
      const completeNote = {
        id: result.note_id,
        user_id: result.user_id,
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
      const { title, description, tags, status, deleted } = req.body;

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
   * DELETE /api/notes/:id - Deletar uma nota
   * Remove uma nota e todos os seus itens associados
   */
  async deleteNote(req, res, next) {
    try {
      const { id } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de propriedade da nota
      await this._validateNoteOwnership(id, userId);

      // Exclusão da nota
      await this.notesRepository.deleteNoteById(id);

      // Confirmação de exclusão
      res.status(200).json({
        message: "Nota deletada com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  // ========================================
  // ENDPOINTS PARA GERENCIAMENTO DE BLOCOS
  // ========================================

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
      const validTypes = [
        "text",
        "todo",
        "list",
        "page",
        "heading",
        "paragraph",
        "quote",
        "code",
      ];
      if (!validTypes.includes(type)) {
        throw new Error(
          `Tipo inválido. Tipos permitidos: ${validTypes.join(", ")}`
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

  // ========================================
  // ENDPOINTS PARA GERENCIAMENTO DE COLABORADORES
  // ========================================

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
          sendCollaborationNotification(
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

  /**
   * GET /api/users/search - Buscar usuários para adicionar como colaboradores
   * Busca usuários por email ou username
   */
  async searchUsers(req, res, next) {
    try {
      const { q } = req.query; // query string

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de dados obrigatórios
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          error: "Query deve ter pelo menos 2 caracteres",
        });
      }

      const searchTerm = q.trim();

      // Buscar usuários (limitado para evitar sobrecarga)
      const users = await this.userRepository.searchUsers(searchTerm);

      // Filtrar dados sensíveis e excluir o próprio usuário
      const filteredUsers = users
        .filter((user) => user && user.user_id !== userId)
        .map((user) => ({
          id: user.user_id,
          username: user.username,
          name: user.name, // Incluir o campo name
          email: user.email, // Pode ser útil para identificação
          avatar_url: user.avatar_url,
        }));

      res.status(200).json({
        users: filteredUsers,
        query: searchTerm,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesController();
