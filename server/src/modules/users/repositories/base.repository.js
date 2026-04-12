const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");

/**
 * Base para repositórios de usuário: expõe `executeQuery` e preferências padrão da app.
 */
class BaseRepository {
  constructor() {
    /** @type {typeof executeQuery} */
    this.executeQuery = executeQuery;

    /** @type {typeof defaultAppPreferences} */
    this.defaultAppPreferences = defaultAppPreferences;
  }
}
module.exports = BaseRepository;
