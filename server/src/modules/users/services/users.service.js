const { prisma } = require("@theweave/database");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const fs = require("fs");

const UsersRepository = require("@/modules/users/repositories/users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const membersRepository = require("@/modules/workspaces/repositories/members.repository");
const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");

const updateProfileLogs = require("@/modules/users/utils/user-logs.util");
const { sendEmailChangeValidation } = require("@/services/email/templates/reset-password");
const { send_code } = require("@/services/email/templates/send-code");
const spacesService = require("@/services/storage.service");

const {
  normalizeEmail,
  normalizeUsername,
  normalizePhoneNumber,
} = require("@/modules/users/utils/unique-conflicts.util");
const { normalizeAppPreferences } = require("@/modules/users/utils/normalize");

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

const normalizeDisplayName = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildDisplayNameFromEmail = (email) => {
  const localPart = String(email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim();

  if (!localPart) return "New user";

  return localPart
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const buildUsernameBaseFromEmail = (email) => {
  const localPart = String(email || "")
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/^[._-]+|[._-]+$/g, "");

  return (localPart || "user").slice(0, 32);
};

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
      if (existingUser.status === "PENDING_INVITE" || !existingUser.email_verified) {
        existingPendingUser = existingUser;
      } else {
        return { conflict: "email" };
      }
    }

    await this._validateCorporateDomain(email, existingPendingUser);

    const storedName =
      normalizeDisplayName(name) ||
      normalizeDisplayName(user_name) ||
      normalizeDisplayName(existingPendingUser?.name) ||
      null;

    const displayName = storedName || buildDisplayNameFromEmail(email);
    const providedUsername = normalizeUsername(username);
    const existingUsername = normalizeUsername(existingPendingUser?.username);
    const baseUsername = buildUsernameBaseFromEmail(email);
    const usernameBase = providedUsername || existingUsername || baseUsername;

    const availability = await UsersRepository.checkUniqueAvailability(
      {
        email,
        phone_number,
        username: usernameBase,
      },
      existingPendingUser ? { excludeUserId: existingPendingUser.user_id } : {}
    );

    if (!availability.email.available) return { conflict: "email" };
    if (!availability.phone_number.available) return { conflict: "phone_number" };
    if (providedUsername && !availability.username.available) return { conflict: "username" };

    let usernameToUse = providedUsername || existingUsername;
    if (!usernameToUse) {
      const candidatePrefix = baseUsername.slice(0, 24);
      usernameToUse = null;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const suffix = attempt === 0 ? "" : `-${crypto.randomBytes(3).toString("hex")}`;
        const candidateBase = candidatePrefix.slice(0, Math.max(1, 50 - suffix.length));
        const candidate = `${candidateBase}${suffix}`;
        const candidateAvailability = await UsersRepository.checkUniqueAvailability(
          { username: candidate },
          existingPendingUser ? { excludeUserId: existingPendingUser.user_id } : {}
        );

        if (candidateAvailability.username.available) {
          usernameToUse = candidate;
          break;
        }
      }
    }

    if (!usernameToUse) return { conflict: "username" };

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const activationToken = crypto.randomBytes(12).toString("hex");
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const currentDateTime = new Date().toISOString().slice(0, 19).replace("T", " ");

    const result = await prisma.$transaction(async (client) => {
      let userId;
      let createdDate;

      if (existingPendingUser) {
        const activatedUser = await UsersRepository.updateUserActivation(
          existingPendingUser.user_id,
          {
            birth_date,
            name: displayName,
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
            username: usernameToUse,
          },
          client
        );
        userId = activatedUser.user_id;
        createdDate = activatedUser.created_at;
      } else {
        const newUser = await UsersRepository.createUser(
          {
            avatar_url: null,
            birth_date,
            email,
            name: displayName,
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
            username: usernameToUse,
          },
          client
        );
        userId = newUser.user_id;
        createdDate = newUser.created_at;
      }

      await UserTokensRepository.deactivateOldEmailTokens(userId, client);
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
        userName: displayName,
        username: usernameToUse,
      };
    });

    // Queue only after commit so the code is valid when the recipient receives it.
    const emailResult = await send_code({
      code: activationCode,
      email: result.email,
      localeHint: defaultAppPreferences.language.interface,
      name: result.userName,
    });

    if (!emailResult.success) {
      // Account creation remains successful; the user can retry confirmation
      // instead of losing a committed account because the queue is unavailable.
      console.error("Failed to queue account activation email:", emailResult.error);
    }

    return { success: true, user: result };
  }

  /** Replaces a pending account's verification code and queues it for delivery. */
  async resendActivationCode(email) {
    const normalizedEmail = normalizeEmail(email);
    const users = await UsersRepository.findByUsernameOrEmail("", normalizedEmail);
    const user = users.find((candidate) => normalizeEmail(candidate.email) === normalizedEmail);

    // Return success for unknown or active accounts to avoid exposing account status.
    if (!user || user.email_verified) return { success: true };

    const activationToken = crypto.randomBytes(12).toString("hex");
    const activationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const currentDateTime = new Date().toISOString().slice(0, 19).replace("T", " ");

    await prisma.$transaction(async (client) => {
      await UserTokensRepository.deactivateOldEmailTokens(user.user_id, client);
      await UserTokensRepository.createEmailActivationToken(
        user.user_id,
        activationToken,
        activationCode,
        currentDateTime,
        client
      );
    });

    return await send_code({
      code: activationCode,
      email: user.email,
      localeHint:
        user.user_preference?.language?.interface || defaultAppPreferences.language.interface,
      name: user.name,
    });
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

    const result = await prisma.$transaction(async (client) => {
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
