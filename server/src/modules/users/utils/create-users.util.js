const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const { withTransaction } = require("@/database/connection");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const CreateUsersRepository = require("@/modules/users/repositories/create-users.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");

const WorkspacesRepository = require("@/modules/workspaces/repositories/workspaces.repository");
const queueController = require("@theweave/database");

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

class CreateUsersService {
  /**
   * Validate corporate domains for user registration.
   */
  async _validateCorporateDomain(email, existingPendingUser) {
    const emailDomain = email.split("@")[1];
    if (emailDomain) {
      const domainInfo = await settingsRepository.findByDomain(emailDomain);
      if (domainInfo) {
        if (!existingPendingUser) {
          throw new Error("CORPORATE_DOMAIN_INVITE_REQUIRED");
        }

        const isMember = await WorkspacesRepository.getMembershipRole(
          domainInfo.workspace_id,
          existingPendingUser.user_id
        );
        if (!isMember) {
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

    const existingUsersByEmail = await SearchUsersRepository.findByUsernameOrEmail("", email);
    const existingUser = existingUsersByEmail.find((u) => u.email === email);

    let existingPendingUser = null;
    if (existingUser) {
      if (existingUser.status === "PENDING_INVITE") {
        existingPendingUser = existingUser;
      } else {
        return { conflict: "email" };
      }
    }

    await this._validateCorporateDomain(email, existingPendingUser);

    const userName = user_name || name;

    const availability = await SearchUsersRepository.checkUniqueAvailability(
      {
        email,
        phone_number,
        username,
      },
      existingPendingUser ? { excludeUserId: existingPendingUser.user_id } : {}
    );

    if (!availability.email.available) return { conflict: "email" };
    if (!availability.username.available) return { conflict: "username" };
    if (!availability.phone_number.available) return { conflict: "phone_number" };

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const activationToken = crypto.randomBytes(12).toString("hex");
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const currentDateTime = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Use transaction for database atomicity
    const result = await withTransaction(async (client) => {
      let userId;
      let createdDate;

      if (existingPendingUser) {
        const activatedUser = await CreateUsersRepository.updateUserActivation(
          existingPendingUser.user_id,
          {
            birth_date,
            name: userName,
            password: hashedPassword,
            phone_number,
            private_profile,
            timezone,
            username,
          },
          client
        );
        userId = activatedUser[0].user_id;
        createdDate = activatedUser[0].created_at;
      } else {
        const newUser = await CreateUsersRepository.createUser(
          {
            avatar_url: null,
            birth_date,
            email,
            name: userName,
            password: hashedPassword,
            phone_number,
            private_profile,
            timezone,
            username,
          },
          client
        );
        userId = newUser[0].user_id;
        createdDate = newUser[0].created_at;
      }

      await UserTokensRepository.createEmailActivationToken(
        userId,
        activationToken,
        activationCode,
        currentDateTime,
        client
      );

      return {
        createdAt: createdDate,
        email,
        userId,
        userName,
        username,
      };
    });

    // Auto-provision personal workspace
    await WorkspacesRepository.autoProvisionPersonalWorkspace(
      result.userId,
      result.userName,
      locale,
      timezone
    );

    // Dispatch async welcome email to Redis queue
    try {
      await queueController.addJob("emails_queue", {
        activationToken,
        email: result.email,
        locale,
        type: "welcome_message",
        userName: result.userName,
        username: result.username,
      });
    } catch (queueError) {
      console.error("Failed to enqueue welcome email, but user was created:", queueError);
    }

    return { success: true, user: result };
  }
}

module.exports = new CreateUsersService();
