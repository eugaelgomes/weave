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
  addCollaborator: (...args) => noteCollaboratorsRepository.addCollaborator(...args),
  bulkInsertNoteBlocks: (...args) => noteBlocksRepository.bulkInsert(...args),
  bumpNoteRevisionById: (...args) => mutateNotesRepository.bumpRevisionById(...args),
  createCompleteNote: (...args) => createNotesRepository.createCompleteNote(...args),
  createNotesQuery: (...args) => createNotesRepository.createNotesQuery(...args),
  deleteAllNoteBlocks: (...args) => noteBlocksRepository.deleteAllByNoteId(...args),
  deleteNoteById: (...args) => mutateNotesRepository.deleteNoteById(...args),
  findNoteBlockById: (...args) => noteBlocksRepository.findById(...args),
  findNoteBlockRowsByNoteId: (...args) => noteBlocksRepository.findRowsByNoteId(...args),
  findNoteBlocksTreeByNoteId: (...args) => noteBlocksRepository.findTreeByNoteId(...args),
  findNotesForDueDateEveReminder: (...args) =>
    readNotesRepository.findNotesForDueDateEveReminder(...args),
  getActiveCollaboratorEmails: (...args) =>
    noteCollaboratorsRepository.getActiveCollaboratorEmails(...args),
  getAllNotesByUserId: (...args) => readNotesRepository.getAllNotesByUserId(...args),
  getAllNotesFormatted: (...args) => readNotesRepository.getAllNotesFormatted(...args),
  getAllNotesStats: (...args) => readNotesRepository.getAllNotesStats(...args),
  getAllNotesWithPagination: (...args) => readNotesRepository.getAllNotesWithPagination(...args),
  getCollaboratorsByNoteId: (...args) =>
    noteCollaboratorsRepository.getCollaboratorsByNoteId(...args),
  getNoteAccessSummary: (...args) => readNotesRepository.getNoteAccessSummary(...args),
  getNoteById: (...args) => readNotesRepository.getNoteById(...args),

  insertDefaultNoteBlock: (...args) => noteBlocksRepository.insertDefaultParagraph(...args),
  insertNoteBlock: (...args) => noteBlocksRepository.insert(...args),
  isCollaborator: (...args) => noteCollaboratorsRepository.isCollaborator(...args),
  processNotesWithSignedUrls: (...args) => readNotesRepository.processNotesWithSignedUrls(...args),
  recuseCollaboration: (...args) => noteCollaboratorsRepository.recuseCollaboration(...args),
  removeCollaborator: (...args) => noteCollaboratorsRepository.removeCollaborator(...args),
  reorderNoteBlocks: (...args) => noteBlocksRepository.reorder(...args),
  softDeleteNoteBlocks: (...args) => noteBlocksRepository.softDelete(...args),
  updateNoteBlock: (...args) => noteBlocksRepository.update(...args),
  updateNoteById: (...args) => mutateNotesRepository.updateNoteById(...args),
};
