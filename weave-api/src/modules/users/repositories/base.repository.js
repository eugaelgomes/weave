const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");

/**
 * Base for user repositories: exposes `executeQuery` and default app preferences.
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
