const { executeQuery, rowCount } = require("@/database/connection");

/**
 * Base para repositórios de notas.
 */
class BaseRepository {
  constructor() {
    /** @type {typeof executeQuery} */
    this.executeQuery = executeQuery;
    /** @type {typeof rowCount} */
    this.rowCount = rowCount;
  }
}

module.exports = BaseRepository;
