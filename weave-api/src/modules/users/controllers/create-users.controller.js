const spacesService = require("@/services/storage");
const BaseController = require("./base.controller");
const { validationResult } = require("express-validator");
const CreateUsersService = require("@/services/users/create-users.service");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const {
  buildUniqueConflictPayload,
} = require("@/modules/users/utils/unique-conflicts");

/**
 * @typedef {import('express').Request & {
 *   body: Record<string, unknown>,
 *   file?: { buffer: Buffer, mimetype: string }
 * }} CreateUserRequest
 */

/**
 * Cadastro de conta e ativação por e-mail.
 */
class CreateUsersController extends BaseController {
  /**
   * Cria usuário (multipart com `profileImage` opcional), envia e-mail de boas-vindas e token de ativação.
   *
   * @param {CreateUserRequest} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async createUser(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        message: "Some inputs cannot be null.",
      });
    }

    try {
      const {
        name,
        user_name,
        username,
        email,
        password,
        timezone,
        private_profile = false,
        birth_date = null,
        phone_number = null,
      } = req.body;

      if (timezone && !this._isValidTimezone(timezone)) {
        const allTimezones = Intl.supportedValuesOf("timeZone");
        return res.status(400).json({
          status: "error",
          message: "Invalid timezone provided.",
          isValidTimezones: allTimezones,
        });
      }

      // Delegate creation and business validations to service
      const result = await CreateUsersService.createUser(
        req.body,
        req.body?.locale || "en"
      );

      if (result.conflict) {
        return res
          .status(409)
          .json(buildUniqueConflictPayload(result.conflict));
      }

      const { user } = result;

      let profileImageUrl = null;
      if (req.file && req.file.path) {
        try {
          // Stream file from disk
          const fs = require("fs");
          const fileStream = fs.createReadStream(req.file.path);

          const saveResult = await spacesService.uploadProfileImage(
            fileStream,
            req.file.mimetype,
            user.userId
          );

          // Clean up temp file
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Failed to delete temp file:", err);
          });

          if (saveResult.success) {
            profileImageUrl = saveResult.key;
            // Delegate profile image update
            const UserDataRepository = require("@/modules/users/repositories/user-data.repository");
            await UserDataRepository.updateProfileImage(
              user.userId,
              profileImageUrl
            );
          } else {
            console.error("Image upload failed:", saveResult.error);
          }
        } catch (imageError) {
          console.error("Erro processando imagem:", imageError);
        }
      }

      return res.status(201).json({
        status: "OK",
        message: `Welcome to Weave Notes ${user.userName}! Check your email to activate your account.`,
        user: {
          id: user.userId,
          name: user.userName,
          username: user.username,
          email: user.email,
          avatar_url: profileImageUrl,
          created_at: user.createdAt,
        },
        redirect: "/auth/",
      });
    } catch (error) {
      if (error.message === "CORPORATE_DOMAIN_INVITE_REQUIRED") {
        return res.status(403).json({
          status: "error",
          message:
            "This email belongs to a verified corporate domain. You need an invitation from the organization to create an account.",
        });
      }
      console.error("An error occurred during registration:", error);
      return this._handleError(error, res, next);
    }
  }

  /**
   * Confirma e-mail com `token` **ou** par `code` + `email`.
   *
   * @param {import('express').Request & { body: { token?: string, code?: string, email?: string } }} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async activateAccount(req, res, next) {
    const { token, code, email } = req.body;

    if (!token && (!code || !email)) {
      return res.status(400).json({
        message:
          "Activation token or both verification code and email are required",
      });
    }

    try {
      let tokenRecord;
      if (token) {
        tokenRecord =
          await UserTokensRepository.findEmailActivationToken(token);
      } else {
        tokenRecord =
          await UserTokensRepository.findEmailActivationTokenByCodeAndEmail(
            code,
            email
          );
      }

      if (!tokenRecord) {
        return res.status(400).json({
          message: "Invalid or expired activation token or verification code",
        });
      }

      // Verifica o email
      const verifiedUser = await UserTokensRepository.verifyUserEmail(
        tokenRecord.user_id
      );

      if (!verifiedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Desativa o token (funciona p/ token ou code pois deactivate usa id do registro)
      await UserTokensRepository.deactivateEmailToken(tokenRecord.token);

      return res.status(200).json({
        message: "Email verified successfully",
        user: {
          id: verifiedUser.user_id,
          email: verifiedUser.email,
          email_verified: verifiedUser.email_verified,
          email_verified_at: verifiedUser.email_verified_at,
        },
      });
    } catch (error) {
      console.error("Erro ao ativar conta:", error);
      this._handleError(error, res, next);
    }
  }
}
module.exports = new CreateUsersController();
