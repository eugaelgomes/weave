const { executeQuery } = require("@/database/connection");

/**
 * Base para repositórios de autenticação: expõe `executeQuery`.
 */
class BaseRepository {
  constructor() {
    /** @type {typeof executeQuery} */
    this.executeQuery = executeQuery;
  }
}

module.exports = BaseRepository;
