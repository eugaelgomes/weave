const BaseRepository = require("./base.repository");
const { prisma } = require("@theweave/database");

/**
 * `tokens` table operations for email verification/change and account activation.
 */
class UserTokensRepository extends BaseRepository {
  /**
   * @param {string|number} userId
   * @returns {Promise<any>}
   */
  async deactivateOldEmailTokens(userId) {
    return await prisma.tokens.updateMany({
      data: {
        active: false,
      },
      where: {
        active: true,
        type: "EMAIL_VERIFICATION",
        user_id: userId,
      },
    });
  }

  /**
   * @param {string|number} userId
   * @param {string} token
   * @param {string} newEmail
   * @param {string} createdAt ISO string or Postgres timestamp
   * @returns {Promise<any>}
   */
  async createEmailChangeToken(userId, token, newEmail, createdAt) {
    const createdDate = new Date(createdAt);
    const expiresDate = new Date(createdDate.getTime() + 60 * 60 * 1000); // 1 hour

    return await prisma.tokens.create({
      data: {
        active: true,
        created_at: createdDate,
        data_to_update: { new_email: newEmail },
        expires_at: expiresDate,
        token: token,
        type: "EMAIL_VERIFICATION",
        user_id: userId,
      },
    });
  }

  /**
   * @param {string|number} userId
   * @param {string} token
   * @returns {Promise<any>}
   */
  async findEmailChangeToken(userId, token) {
    return await prisma.tokens.findFirst({
      where: {
        active: true,
        expires_at: { gt: new Date() },
        token: token,
        type: "EMAIL_VERIFICATION",
        user_id: userId,
      },
    });
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<unknown>}
   */
  async getDataToUpdate(userId) {
    const result = await prisma.tokens.findFirst({
      select: { data_to_update: true },
      where: {
        active: true,
        expires_at: { gt: new Date() },
        type: "EMAIL_VERIFICATION",
        user_id: userId,
      },
    });
    return result?.data_to_update;
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<any>}
   */
  async clearDataToUpdate(userId) {
    return await prisma.tokens.updateMany({
      data: {
        data_to_update: null,
      },
      where: {
        type: "EMAIL_VERIFICATION",
        user_id: userId,
      },
    });
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<any>}
   */
  async deactivateOldLoginCodeTokens(userId) {
    return await prisma.tokens.updateMany({
      data: {
        active: false,
      },
      where: {
        active: true,
        type: "LOGIN_CODE",
        user_id: userId,
      },
    });
  }

  /**
   * @param {string|number} userId
   * @param {string} token
   * @param {string} code
   * @param {string} createdAt
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<any>}
   */
  async createLoginCodeToken(userId, token, code, createdAt, client = prisma) {
    const createdDate = new Date(createdAt);
    const expiresDate = new Date(createdDate.getTime() + 10 * 60 * 1000); // 10 minutes

    return await client.tokens.create({
      data: {
        active: true,
        code: code,
        created_at: createdDate,
        expires_at: expiresDate,
        token: token,
        type: "LOGIN_CODE",
        user_id: userId,
      },
    });
  }

  /**
   * @param {string} token
   * @returns {Promise<any>}
   */
  async deactivateEmailToken(token) {
    return await prisma.tokens.updateMany({
      data: { active: false },
      where: { token: token },
    });
  }

  /**
   * @param {string|number} userId
   * @param {string} code
   * @returns {Promise<any>}
   */
  async findLoginCodeTokenByCodeAndUserId(code, userId) {
    return await prisma.tokens.findFirst({
      where: {
        active: true,
        code: code,
        expires_at: { gt: new Date() },
        type: "LOGIN_CODE",
        user_id: userId,
      },
    });
  }

  /**
   * @param {string} token
   * @returns {Promise<any>}
   */
  async consumeLoginCodeToken(token) {
    return await prisma.tokens.updateMany({
      data: {
        active: false,
        used_at: new Date(),
      },
      where: {
        token: token,
        type: "LOGIN_CODE",
      },
    });
  }

  /**
   * @param {string|number} userId
   * @param {string} token
   * @param {string} code
   * @param {string} createdAt
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<any>}
   */
  async createEmailActivationToken(userId, token, code, createdAt, client = prisma) {
    const createdDate = new Date(createdAt);
    const expiresDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return await client.tokens.create({
      data: {
        active: true,
        code: code,
        created_at: createdDate,
        expires_at: expiresDate,
        token: token,
        type: "EMAIL_VERIFICATION",
        user_id: userId,
      },
    });
  }

  /**
   * @param {string} token
   * @returns {Promise<any>}
   */
  async findEmailActivationToken(token) {
    return await prisma.tokens.findFirst({
      where: {
        active: true,
        expires_at: { gt: new Date() },
        token: token,
        type: "EMAIL_VERIFICATION",
      },
    });
  }

  /**
   * @param {string} code
   * @param {string} email
   * @returns {Promise<any>}
   */
  async findEmailActivationTokenByCodeAndEmail(code, email) {
    return await prisma.tokens.findFirst({
      where: {
        active: true,
        code: code,
        expires_at: { gt: new Date() },
        type: "EMAIL_VERIFICATION",
        users: { email: email },
      },
    });
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<{ user_id: string|number, email: string, email_verified: boolean, email_verified_at: Date|string|null }|undefined>}
   */
  async verifyUserEmail(userId) {
    return await prisma.users.update({
      data: {
        email_verified: true,
        email_verified_at: new Date(),
      },
      select: {
        email: true,
        email_verified: true,
        email_verified_at: true,
        user_id: true,
      },
      where: { user_id: userId },
    });
  }

  // ==========================================
  // DELETE ACCOUNT TOKENS
  // ==========================================

  async createDeleteAccountToken(userId, token) {
    await prisma.tokens.updateMany({
      data: { active: false },
      where: {
        active: true,
        type: "DELETE_USER_ACCOUNT",
        user_id: userId,
      },
    });

    const createdDate = new Date();
    const expiresDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return await prisma.tokens.create({
      data: {
        active: true,
        created_at: createdDate,
        expires_at: expiresDate,
        token: token,
        type: "DELETE_USER_ACCOUNT",
        user_id: userId,
      },
    });
  }

  async findDeleteAccountToken(token) {
    return await prisma.tokens.findFirst({
      where: {
        active: true,
        expires_at: { gt: new Date() },
        token: token,
        type: "DELETE_USER_ACCOUNT",
      },
    });
  }

  async deactivateDeleteAccountToken(token) {
    return await prisma.tokens.updateMany({
      data: { active: false },
      where: {
        token: token,
        type: "DELETE_USER_ACCOUNT",
      },
    });
  }
}

module.exports = new UserTokensRepository();
