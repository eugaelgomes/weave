const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
// Import repositories
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const ProjectsCollaboratorsRepository = require("@/modules/projects/repositories/projects-collaborators.repository");
const NoteCollaboratorsRepository = require("@/modules/notes/repositories/note-collaborators.repository");
const NotesCommentsRepository = require("@/modules/notes/repositories/notes-comments.repository");

class SearchUsersService {
  /**
   * Perform raw user search and merge context data.
   */
  async searchWithContext(searchTerm, searcherUserId, contextType, contextId) {
    // 1. Raw search (isolated by searcher's workspace)
    const users = await SearchUsersRepository.searchUsers(
      searchTerm,
      searcherUserId
    );

    if (!users || users.length === 0) {
      return [];
    }

    const userIds = users.map((u) => u.user_id);
    let contextMap = {}; // { [userId]: { is_member, role, status, etc } }

    // 2. Context Lookup (Decoupled Data Fetching)
    if (contextType && contextId) {
      contextMap = await this._fetchContextData(
        userIds,
        contextType,
        contextId
      );
    }

    // 3. Merge data
    return users.map((user) => {
      const info = contextMap[user.user_id];
      return {
        id: user.user_id,
        username: user.username,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        context_info: info || { is_member: false, role: null, status: null },
      };
    });
  }

  /**
   *
   * @param {string[]} userIds
   * @param {string} contextType
   * @param {string} contextId
   * @returns
   */
  async _fetchContextData(userIds, contextType, contextId) {
    const map = {};
    try {
      if (contextType === "organization") {
        const members = await OrganizationsRepository.getMembershipsByUserIds(
          userIds,
          contextId
        );
        members.forEach((m) => {
          map[m.user_id] = { is_member: true, role: m.role, status: m.status };
        });
      } else if (contextType === "project") {
        const collabs =
          await ProjectsCollaboratorsRepository.getCollaboratorsByUserIds(
            userIds,
            contextId
          );
        collabs.forEach((c) => {
          map[c.user_id] = { is_member: true, role: c.role, status: "ACTIVE" };
        });
      } else if (contextType === "note" || contextType === "task") {
        const collabs =
          await NoteCollaboratorsRepository.getCollaboratorsByUserIds(
            userIds,
            contextId
          );
        collabs.forEach((c) => {
          map[c.user_id] = { is_member: true, role: c.role, status: "ACTIVE" };
        });
      } else if (contextType === "comment") {
        // Resolve comment note_id to check access
        const comment = await NotesCommentsRepository.getById(contextId);
        if (comment && comment.note_id) {
          const collabs =
            await NoteCollaboratorsRepository.getCollaboratorsByUserIds(
              userIds,
              comment.note_id
            );
          collabs.forEach((c) => {
            map[c.user_id] = {
              is_member: true,
              role: c.role,
              status: "ACTIVE",
            };
          });
        }
      }
    } catch (err) {
      console.error(
        `[SearchUsersService] Error fetching context ${contextType}:`,
        err
      );
    }
    return map;
  }
}

module.exports = new SearchUsersService();
