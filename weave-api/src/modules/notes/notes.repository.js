const readNotesRepository = require("./repositories/read-notes.repository");
const createNotesRepository = require("./repositories/create-notes.repository");
const mutateNotesRepository = require("./repositories/mutate-notes.repository");
const noteCollaboratorsRepository = require("./repositories/note-collaborators.repository");
const noteBlocksRepository = require("./repositories/note-blocks.repository");

/**
 * Fachada do módulo de notas: mesma API pública que o repositório monolítico,
 * delegando para repositórios por responsabilidade.
 */
module.exports = {
  getAllNotesByUserId: (...args) =>
    readNotesRepository.getAllNotesByUserId(...args),
  getAllNotesFormatted: (...args) =>
    readNotesRepository.getAllNotesFormatted(...args),
  getAllNotesWithPagination: (...args) =>
    readNotesRepository.getAllNotesWithPagination(...args),
  getNoteById: (...args) => readNotesRepository.getNoteById(...args),
  findNotesForDueDateEveReminder: (...args) =>
    readNotesRepository.findNotesForDueDateEveReminder(...args),
  getAllNotesStats: (...args) => readNotesRepository.getAllNotesStats(...args),
  processNotesWithSignedUrls: (...args) =>
    readNotesRepository.processNotesWithSignedUrls(...args),
  createNotesQuery: (...args) =>
    createNotesRepository.createNotesQuery(...args),
  createCompleteNote: (...args) =>
    createNotesRepository.createCompleteNote(...args),
  updateNoteById: (...args) => mutateNotesRepository.updateNoteById(...args),
  deleteNoteById: (...args) => mutateNotesRepository.deleteNoteById(...args),
  addCollaborator: (...args) =>
    noteCollaboratorsRepository.addCollaborator(...args),
  removeCollaborator: (...args) =>
    noteCollaboratorsRepository.removeCollaborator(...args),
  recuseCollaboration: (...args) =>
    noteCollaboratorsRepository.recuseCollaboration(...args),
  getCollaboratorsByNoteId: (...args) =>
    noteCollaboratorsRepository.getCollaboratorsByNoteId(...args),
  isCollaborator: (...args) =>
    noteCollaboratorsRepository.isCollaborator(...args),
  getActiveCollaboratorEmails: (...args) =>
    noteCollaboratorsRepository.getActiveCollaboratorEmails(...args),

  findNoteBlockRowsByNoteId: (...args) =>
    noteBlocksRepository.findRowsByNoteId(...args),
  findNoteBlocksTreeByNoteId: (...args) =>
    noteBlocksRepository.findTreeByNoteId(...args),
  findNoteBlockById: (...args) => noteBlocksRepository.findById(...args),
  insertDefaultNoteBlock: (...args) =>
    noteBlocksRepository.insertDefaultParagraph(...args),
  bulkInsertNoteBlocks: (...args) =>
    noteBlocksRepository.bulkInsert(...args),
  insertNoteBlock: (...args) => noteBlocksRepository.insert(...args),
  updateNoteBlock: (...args) => noteBlocksRepository.update(...args),
  softDeleteNoteBlocks: (...args) =>
    noteBlocksRepository.softDelete(...args),
  reorderNoteBlocks: (...args) => noteBlocksRepository.reorder(...args),
  deleteAllNoteBlocks: (...args) =>
    noteBlocksRepository.deleteAllByNoteId(...args),
};
