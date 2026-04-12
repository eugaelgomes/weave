const notesRepository = require("@/modules/notes/notes.repository");
const blocksRepository = require("@/modules/notes/repositories/blocks.repository");

/**
 * Base dos controllers de notas: autenticação, acesso e formatação.
 */
class NotesBaseController {
  constructor() {
    this.notesRepository = notesRepository;
    this.blocksRepository = blocksRepository;
  }

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
      properties: note.properties || {},
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
      errorMessage.includes("inválido") ||
      errorMessage.includes("Nenhum campo") ||
      errorMessage.includes("Nenhum arquivo")
    ) {
      return res.status(400).json({ error: errorMessage });
    }

    if (
      errorMessage.includes("não encontrada") ||
      errorMessage.includes("não encontrado") ||
      errorMessage.includes("Acesso negado")
    ) {
      return res.status(404).json({ error: errorMessage });
    }

    next(error);
  }
}

module.exports = NotesBaseController;
