const spacesService = require("@/services/storage");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");

const BaseController = require("./base.controller");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const CreateUsersRepository = require("@/modules/users/repositories/create-users.repository");
const UserDataRepository = require("@/modules/users/repositories/user-data.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const { welcome_message } = require("@/services/email/templates/welcome-mail");
const PlansManager = require("@/services/plans/manager");

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

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

      // Validar Domínio Corporativo
      // Se o email pertencer a um domínio verificado, o usuário DEVE ter um convite.
      const emailDomain = email.split("@")[1];
      if (emailDomain) {
        const domainInfo =
          await OrganizationDomainsRepository.findActiveByDomain(emailDomain);

        if (
          domainInfo &&
          (domainInfo.status === "VERIFIED" || domainInfo.status === "PENDING")
        ) {
          // Verifica se existe convite pendente para este email nesta organização
          const existingInvite =
            await OrganizationsRepository.checkExistingInvite(
              domainInfo.organization_id,
              email
            );

          if (!existingInvite) {
            return res.status(403).json({
              status: "error",
              message:
                "This email belongs to a verified corporate domain. You need an invitation from the organization to create an account.",
            });
          }
        }
      }

      // Usa user_name se fornecido, senão usa name
      const userName = user_name || name;

      if (!userName) {
        return res.status(400).json({
          status: "error",
          message: "Name is required.",
        });
      }

      if (timezone && !this._isValidTimezone(timezone)) {
        const allTimezones = Intl.supportedValuesOf("timeZone");
        return res.status(400).json({
          status: "error",
          message: "Invalid timezone provided.",
          isValidTimezones: allTimezones,
        });
      }

      const existingUsers = await SearchUsersRepository.findByUsernameOrEmail(
        username,
        email
      );

      if (existingUsers.length > 0) {
        const emailExists = existingUsers.some((u) => u.email === email);

        const userExists = existingUsers.some(
          (u) => u.username === username || u.usuario === username
        );

        if (emailExists && userExists)
          return res.status(409).json({
            status: "failed",
            message: "User and email already exist!",
          });
        if (emailExists)
          return res
            .status(409)
            .json({ status: "failed", message: "Email is already in use!" });
        if (userExists)
          return res
            .status(409)
            .json({ status: "failed", message: "Username is already in use!" });
      }

      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const newUser = await CreateUsersRepository.createUser({
        name: userName,
        username,
        email,
        password: hashedPassword,
        timezone,
        private_profile,
        birth_date,
        phone_number,
        avatar_url: null,
      });

      const userId = newUser[0].user_id;

      let profileImageUrl = null;
      if (req.file && req.file.buffer) {
        try {
          const saveResult = await spacesService.uploadProfileImage(
            req.file.buffer,
            req.file.mimetype,
            userId
          );
          if (saveResult.success) {
            profileImageUrl = saveResult.key;
            await UserDataRepository.updateProfileImage(
              userId,
              profileImageUrl
            );
          } else {
            console.error("Image upload failed:", saveResult.error);
          }
        } catch (imageError) {
          console.error("Erro processando imagem:", imageError);
        }
      }

      const activationToken = crypto.randomBytes(12).toString("hex");
      const activationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const currentDateTime = this._getCurrentDateTime();
      await UserTokensRepository.createEmailActivationToken(
        userId,
        activationToken,
        activationCode,
        currentDateTime
      );

      // Atribuir plano padrão ao novo usuário
      try {
        await PlansManager.setDefaultPlanForNewUser(userId);
      } catch (planError) {
        console.error("Erro ao atribuir plano padrão:", planError);
        // Não bloqueamos a criação do usuário por causa disso
      }

      await welcome_message(
        userName,
        email,
        username,
        activationToken,
        activationCode
      );

      return res.status(201).json({
        status: "OK",
        message: `Welcome to Weave Notes ${userName}! Check your email to activate your account.`,
        user: {
          id: userId,
          name: userName,
          username,
          email,
          avatar_url: profileImageUrl,
          created_at: newUser[0].created_at,
        },
        redirect: "/auth/",
      });
    } catch (error) {
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
  async activateAccount(req, res) {
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
      this._handleError(error, res);
    }
  }
}
module.exports = new CreateUsersController();
