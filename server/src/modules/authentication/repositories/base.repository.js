const { executeQuery } = require("@/database/connection");

/**
 * Base for authentication repositories: exposes `executeQuery`.
 */
class BaseRepository {
  constructor() {
    /** @type {typeof executeQuery} */
    this.executeQuery = executeQuery;
  }
}

module.exports = BaseRepository;
