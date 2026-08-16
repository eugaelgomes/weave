const { executeQuery, rowCount } = require("@/database/connection");

/**
 * Base repository for Slack module.
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
