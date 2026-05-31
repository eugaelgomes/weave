const { withTransaction } = require("@/database/connection");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const CreateUsersRepository = require("@/modules/users/repositories/create-users.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const queueController = require("@/services/queue/queue-controller");

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

class CreateUsersService {
  /**
   * Validate corporate domains for user registration.
   */
  async _validateCorporateDomain(email) {
    const emailDomain = email.split("@")[1];
    if (emailDomain) {
      const domainInfo =
        await OrganizationDomainsRepository.findActiveByDomain(emailDomain);
      if (
        domainInfo &&
        (domainInfo.status === "VERIFIED" || domainInfo.status === "PENDING")
      ) {
        const existingInvite =
          await OrganizationsRepository.checkExistingInvite(
            domainInfo.organization_id,
            email
          );
        if (!existingInvite) {
          throw new Error("CORPORATE_DOMAIN_INVITE_REQUIRED");
        }
      }
    }
  }

  /**
   * Create user within an ACID transaction.
   * Delegates S3 and emails to external handlers.
   */
  async createUser(userData, locale = "en") {
    const {
      email,
      username,
      phone_number,
      password,
      timezone,
      private_profile,
      birth_date,
      name,
      user_name,
    } = userData;

    await this._validateCorporateDomain(email);

    const userName = user_name || name;

    const availability = await SearchUsersRepository.checkUniqueAvailability({
      username,
      email,
      phone_number,
    });
    if (!availability.email.available) return { conflict: "email" };
    if (!availability.username.available) return { conflict: "username" };
    if (!availability.phone_number.available)
      return { conflict: "phone_number" };

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const activationToken = crypto.randomBytes(12).toString("hex");
    const activationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const currentDateTime = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    // Use transaction for database atomicity
    const result = await withTransaction(async (client) => {
      const newUser = await CreateUsersRepository.createUser(
        {
          name: userName,
          username,
          email,
          password: hashedPassword,
          timezone,
          private_profile,
          birth_date,
          phone_number,
          avatar_url: null,
        },
        client
      );

      const userId = newUser[0].user_id;

      await UserTokensRepository.createEmailActivationToken(
        userId,
        activationToken,
        activationCode,
        currentDateTime,
        client
      );

      return {
        userId,
        userName,
        username,
        email,
        createdAt: newUser[0].created_at,
      };
    });

    // Dispatch async welcome email to Redis queue
    try {
      await queueController.addJob("emails_queue", {
        type: "welcome_message",
        userName: result.userName,
        email: result.email,
        username: result.username,
        activationToken,
        locale,
      });
    } catch (queueError) {
      console.error(
        "Failed to enqueue welcome email, but user was created:",
        queueError
      );
    }

    return { success: true, user: result };
  }
}

module.exports = new CreateUsersService();
