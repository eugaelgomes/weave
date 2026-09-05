const { prisma } = require("@theweave/database");
const { defaultAppPreferences } = require("@/modules/users/utils/normalize");

/**
 * Base for user repositories: exposes `prisma` and default app preferences.
 */
class BaseRepository {
  constructor() {
    /** @type {import('@prisma/client').PrismaClient} */
    this.prisma = prisma;

    /** @type {typeof defaultAppPreferences} */
    this.defaultAppPreferences = defaultAppPreferences;
  }
}
module.exports = BaseRepository;
