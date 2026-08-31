const { withTransaction } = require("@/database/connection");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const fs = require("fs");

const UsersRepository = require("@/modules/users/repositories/users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const membersRepository = require("@/modules/workspaces/repositories/members.repository");
const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");

const updateProfileLogs = require("@/modules/users/utils/user-logs.util");
const { sendEmailChangeValidation } = require("@/services/email/templates/reset-password");
const spacesService = require("@/services/storage.service");

const {
  normalizeEmail,
  normalizeUsername,
  normalizePhoneNumber,
} = require("@/modules/users/utils/unique-conflicts.util");
const { normalizeAppPreferences } = require("@/modules/users/utils/normalize");

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

class UsersService {
  /**
   * Fetches the user by ID
   * @param {string} userId
   */
  async getUserById(userId) {
    return await UsersRepository.getUserById(userId);
  }

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

        const isMember = await membersRepository.getMembershipRole(
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
  async createUser(userData) {
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
      terms_version,
    } = userData;

    const existingUsersByEmail = await UsersRepository.findByUsernameOrEmail("", email);
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

    const availability = await UsersRepository.checkUniqueAvailability(
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

    const result = await withTransaction(async (client) => {
      let userId;
      let createdDate;

      if (existingPendingUser) {
        const activatedUser = await UsersRepository.updateUserActivation(
          existingPendingUser.user_id,
          {
            birth_date,
            name: userName,
            onboarding_state: {
              completed_steps: ["terms"],
              step: "TERMS_ACCEPTED",
              terms_accepted_at: new Date().toISOString(),
              terms_version: terms_version,
            },
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
        const newUser = await UsersRepository.createUser(
          {
            avatar_url: null,
            birth_date,
            email,
            name: userName,
            onboarding_state: {
              completed_steps: ["terms"],
              step: "TERMS_ACCEPTED",
              terms_accepted_at: new Date().toISOString(),
              terms_version: terms_version,
            },
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

    return { success: true, user: result };
  }

  /**
   * Update Profile Data
   */
  async updateProfile(userId, currentUser, reqBody, reqFile, reqObj) {
    const auditChanges = {};
    let emailPendingValidation = false;
    let pendingEmail = null;

    const {
      name,
      username,
      email,
      emailValidationToken,
      currentPassword,
      newPassword,
      theme_mode,
      birth_date,
      phone_number,
      private_profile,
      usage_preference,
      user_preference,
    } = reqBody;

    const result = await withTransaction(async (client) => {
      // 1. Process Password Update
      if (currentPassword && newPassword) {
        const match = await bcrypt.compare(currentPassword, currentUser.password);
        if (!match) {
          updateProfileLogs.createLog(userId, "security_change", reqObj, "failure", {
            reason: "wrong_current_password",
          });
          throw new Error("INCORRECT_PASSWORD");
        }
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await UsersRepository.updateUserPassword(userId, hashedPassword, client);
        auditChanges.password_changed = true;
        updateProfileLogs.createLog(userId, "security_change", reqObj, "success", {
          action: "password_update",
        });
      }

      // 2. Process Email Token Validation
      if (emailValidationToken) {
        const tokenRecord = await UserTokensRepository.findEmailChangeToken(
          userId,
          emailValidationToken
        );
        if (!tokenRecord) throw new Error("INVALID_TOKEN");

        const dataToUpdate = await UserTokensRepository.getDataToUpdate(userId);
        if (dataToUpdate?.new_email) {
          await UsersRepository.updateUserProfile(
            userId,
            {
              email: dataToUpdate.new_email,
            },
            client
          );
          await UserTokensRepository.clearDataToUpdate(userId);
          await UserTokensRepository.deactivateEmailToken(emailValidationToken);
          auditChanges.email_status = "verified_and_changed";
          auditChanges.new_email = dataToUpdate.new_email;
        }
      }

      // 3. Process New Email Request
      if (
        email !== undefined &&
        normalizeEmail(email) !== normalizeEmail(currentUser.email) &&
        !emailValidationToken
      ) {
        const emailAvailability = await UsersRepository.checkUniqueAvailability(
          { email },
          { excludeUserId: userId }
        );
        if (!emailAvailability.email.available) throw new Error("CONFLICT_EMAIL");

        const token = crypto.randomBytes(10).toString("hex");
        await UserTokensRepository.deactivateOldEmailTokens(userId);
        await UserTokensRepository.createEmailChangeToken(
          userId,
          token,
          email,
          new Date().toISOString().slice(0, 19).replace("T", " ")
        );

        const emailResult = await sendEmailChangeValidation(currentUser.email, email, token);
        if (!emailResult.success) throw new Error("EMAIL_SEND_ERROR");

        emailPendingValidation = true;
        pendingEmail = email;
        auditChanges.email_request = "pending_validation";
        auditChanges.requested_email = email;
      }

      // 4. Update Other Fields
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (theme_mode !== undefined) updates.theme_mode = theme_mode;
      if (birth_date !== undefined) updates.birth_date = birth_date || null;
      if (phone_number !== undefined) updates.phone_number = phone_number || null;
      if (private_profile !== undefined) updates.private_profile = private_profile;

      const resolvedPreference = usage_preference ?? user_preference;
      if (resolvedPreference !== undefined) {
        const parsed =
          typeof resolvedPreference === "string"
            ? JSON.parse(resolvedPreference)
            : resolvedPreference;
        updates.user_preference = normalizeAppPreferences(parsed);
      }

      if (
        username !== undefined &&
        normalizeUsername(username) !== normalizeUsername(currentUser.username)
      ) {
        const usernameAvailability = await UsersRepository.checkUniqueAvailability(
          { username },
          { excludeUserId: userId }
        );
        if (!usernameAvailability.username.available) throw new Error("CONFLICT_USERNAME");
        updates.username = username;
      }

      if (
        phone_number !== undefined &&
        normalizePhoneNumber(phone_number) !== normalizePhoneNumber(currentUser.phone_number)
      ) {
        const phoneAvailability = await UsersRepository.checkUniqueAvailability(
          { phone_number },
          { excludeUserId: userId }
        );
        if (!phoneAvailability.phone_number.available) throw new Error("CONFLICT_PHONE");
      }

      let updatedUser = currentUser;
      if (Object.keys(updates).length > 0) {
        updatedUser = await UsersRepository.updateUserProfile(userId, updates, client);
        Object.assign(auditChanges, updates);
      }

      return updatedUser;
    });

    // 5. Upload Avatar
    let avatarUrl = result.avatar_url;
    if (reqFile && reqFile.path) {
      const fileStream = fs.createReadStream(reqFile.path);
      const uploadResult = await spacesService.uploadProfileImage(
        fileStream,
        reqFile.mimetype,
        userId
      );

      fs.unlink(reqFile.path, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });

      if (uploadResult.success) {
        const updateImage = await UsersRepository.updateProfileImage(userId, uploadResult.key);
        avatarUrl = updateImage[0].avatar_url;
        auditChanges.avatar_updated = true;
      }
    }

    if (Object.keys(auditChanges).length > 0) {
      updateProfileLogs.createLog(userId, "profile_update", reqObj, "success", auditChanges);
    }

    return {
      emailPendingValidation,
      pendingEmail,
      updatedUser: { ...result, avatar_url: avatarUrl },
    };
  }

  /**
   * Perform raw user search and merge context data.
   */
  async searchWithContext(searchTerm, searcherUserId, contextType, contextId) {
    const users = await UsersRepository.searchUsers(searchTerm, searcherUserId);

    if (!users || users.length === 0) {
      return [];
    }

    const userIds = users.map((u) => u.user_id);
    let contextMap = {};

    if (contextType && contextId) {
      contextMap = await this._fetchContextData(userIds, contextType, contextId);
    }

    return users.map((user) => {
      const info = contextMap[user.user_id];
      return {
        avatar_url: user.avatar_url,
        context_info: info || { is_member: false, role: null, status: null },
        email: user.email,
        id: user.user_id,
        name: user.name,
        username: user.username,
      };
    });
  }

  async _fetchContextData(userIds, contextType, contextId) {
    const map = {};
    try {
      if (contextType === "workspace") {
        const members = await membersRepository.getMembershipsByUserIds(userIds, contextId);
        members.forEach((m) => {
          map[m.user_id] = { is_member: true, role: m.role, status: m.status };
        });
      }
    } catch (err) {
      console.error(`[UsersService] Error fetching context ${contextType}:`, err);
    }
    return map;
  }
}

module.exports = new UsersService();
