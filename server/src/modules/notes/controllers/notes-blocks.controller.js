const NotesBaseController = require("./base.controller");

/**
 * Blocos dentro de notas.
 */
class NotesBlocksController extends NotesBaseController {
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
      } = require("@/utils/patterns/product-patterns");
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
}

module.exports = new NotesBlocksController();
