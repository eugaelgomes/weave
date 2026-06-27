const { withTransaction } = require("@/database/connection");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const fs = require("fs");
const UserDataRepository = require("@/modules/users/repositories/user-data.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const { normalizeAppPreferences } = require("@/modules/users/normalize");
const {
  sendEmailChangeValidation,
} = require("@/services/email/templates/reset-password");
const spacesService = require("@/services/storage");
const updateProfileLogs = require("@/utils/system-logs/update-profile-logs");
const {
  normalizeEmail,
  normalizeUsername,
  normalizePhoneNumber,
} = require("@/modules/users/utils/unique-conflicts");

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

class UserDataService {
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
        const match = await bcrypt.compare(
          currentPassword,
          currentUser.password
        );
        if (!match) {
          updateProfileLogs.createLog(
            userId,
            "security_change",
            reqObj,
            "failure",
            { reason: "wrong_current_password" }
          );
          throw new Error("INCORRECT_PASSWORD");
        }
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await UserDataRepository.updateUserPassword(userId, hashedPassword);
        auditChanges.password_changed = true;
        updateProfileLogs.createLog(
          userId,
          "security_change",
          reqObj,
          "success",
          { action: "password_update" }
        );
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
          await UserDataRepository.updateUserProfile(userId, {
            email: dataToUpdate.new_email,
          });
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
        const emailAvailability =
          await SearchUsersRepository.checkUniqueAvailability(
            { email },
            { excludeUserId: userId }
          );
        if (!emailAvailability.email.available)
          throw new Error("CONFLICT_EMAIL");

        const token = crypto.randomBytes(10).toString("hex");
        await UserTokensRepository.deactivateOldEmailTokens(userId);
        await UserTokensRepository.createEmailChangeToken(
          userId,
          token,
          email,
          new Date().toISOString().slice(0, 19).replace("T", " ")
        );

        // Dispatch validation email
        const emailResult = await sendEmailChangeValidation(
          currentUser.email,
          email,
          token
        );
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
      if (phone_number !== undefined)
        updates.phone_number = phone_number || null;
      if (private_profile !== undefined)
        updates.private_profile = private_profile;

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
        const usernameAvailability =
          await SearchUsersRepository.checkUniqueAvailability(
            { username },
            { excludeUserId: userId }
          );
        if (!usernameAvailability.username.available)
          throw new Error("CONFLICT_USERNAME");
        updates.username = username;
      }

      if (
        phone_number !== undefined &&
        normalizePhoneNumber(phone_number) !==
          normalizePhoneNumber(currentUser.phone_number)
      ) {
        const phoneAvailability =
          await SearchUsersRepository.checkUniqueAvailability(
            { phone_number },
            { excludeUserId: userId }
          );
        if (!phoneAvailability.phone_number.available)
          throw new Error("CONFLICT_PHONE");
      }

      let updatedUser = currentUser;
      if (Object.keys(updates).length > 0) {
        updatedUser = await UserDataRepository.updateUserProfile(
          userId,
          updates
        );
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
        const updateImage = await UserDataRepository.updateProfileImage(
          userId,
          uploadResult.key
        );
        avatarUrl = updateImage[0].avatar_url;
        auditChanges.avatar_updated = true;
      }
    }

    if (Object.keys(auditChanges).length > 0) {
      updateProfileLogs.createLog(
        userId,
        "profile_update",
        reqObj,
        "success",
        auditChanges
      );
    }

    return {
      updatedUser: { ...result, avatar_url: avatarUrl },
      emailPendingValidation,
      pendingEmail,
    };
  }
}

module.exports = new UserDataService();
