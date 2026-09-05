const { prisma } = require("@theweave/database");
const { defaultAppPreferences } = require("@/modules/users/utils/normalize");

/**
 * Base abstract class for user-related repositories.
 * Exposes shared Prisma client instances and application preference defaults.
 */
class BaseRepository {
  constructor() {
    /**
     * Singleton instance of the Prisma Client.
     * @type {import('@prisma/client').PrismaClient}
     */
    this.prisma = prisma;

    /**
     * Default user application preferences.
     * @type {Record<string, any>}
     */
    this.defaultAppPreferences = defaultAppPreferences;
  }
}

module.exports = BaseRepository;
