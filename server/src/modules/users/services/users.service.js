const membersRepository = require("@/modules/workspaces/repositories/members.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");

class UsersService {
  /**
   * Fetches the user by ID
   * @param {string} userId
   */
  async getUserById(userId) {
    return await SearchUsersRepository.getUserById(userId);
  }

  /**
   * Perform raw user search and merge context data.
   */
  async searchWithContext(searchTerm, searcherUserId, contextType, contextId) {
    // 1. Raw search (isolated by searcher's workspace)
    const users = await SearchUsersRepository.searchUsers(searchTerm, searcherUserId);

    if (!users || users.length === 0) {
      return [];
    }

    const userIds = users.map((u) => u.user_id);
    let contextMap = {}; // { [userId]: { is_member, role, status, etc } }

    // 2. Context Lookup (Decoupled Data Fetching)
    if (contextType && contextId) {
      contextMap = await this._fetchContextData(userIds, contextType, contextId);
    }

    // 3. Merge data
    return users.map((user) => {
      const info = contextMap[user.user_id];
      return {
        avatar_url: user.avatar_url,
        context_info: info || { is_member: false, role: null, status: null },
        email: user.email,
        id: user.user_id,
        name: user.name,
        username: user.username,
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
      if (contextType === "workspace") {
        const members = await membersRepository.getMembershipsByUserIds(userIds, contextId);
        members.forEach((m) => {
          map[m.user_id] = { is_member: true, role: m.role, status: m.status };
        });
      }
    } catch (err) {
      console.error(`[UsersService] Error fetching context ${contextType}:`, err);
    }
    return map;
  }
}

module.exports = new UsersService();
