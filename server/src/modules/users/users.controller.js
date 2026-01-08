const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const imageUtils = require("@/middlewares/data/image-utils");

// Repositórios
const UserRepository = require("@/modules/users/users.repository");
const AuthRepository = require("@/modules/auth/auth.repository");

// Serviços de Email e Logs
const welcomeMailModule = require("@/services/email/templates/welcome-mail");
const deleteAccountModule = require("@/services/email/templates/delete-account");
const emailChangeModule = require("@/services/email/templates/users-access/reset-password");
const updateProfileLogs = require("@/utils/system_logs/update_profile-logs");
const PlansManager = require("@/services/plans/manager");
const { userDataResponse } = require("./normalizer");

const { welcome_message } = welcomeMailModule;
const { delete_account_notification } = deleteAccountModule;
const { sendEmailChangeValidation } = emailChangeModule;

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone");

class userController {
  constructor() {
    this.userRepository = UserRepository;
    this.authRepository = AuthRepository;
  }

  _getCurrentDateTime() {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  _isValidTimezone(timezone) {
    return ALL_TIMEZONES.includes(timezone);
  }

  _handleError(error, res, next) {
    console.error(`[userController Error]: ${error.message}`, {
      stack: error.stack,
    });

    if (
      error.message.includes("obrigatório") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ error: error.message });
    }
    if (
      error.message.includes("não encontrada") ||
      error.message.includes("negado")
    ) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({ error: "Internal server error." });
  }

  // Simulação do método que estava faltando
  _validateAuthentication(req) {
    if (!req.user || !req.user.userId) {
      throw new Error("Acesso negado: Usuário não autenticado");
    }
    return req.user.userId;
  }

  // Criação de novo usuário
  async createUser(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        message: "Some inputs cannot be null.",
      });
    }

    try {
      let {
        name,
        username,
        email,
        password,
        timezone = null,
        private_profile = false,
        birth_date = null,
        phone_number = null,
      } = req.body;

      if (timezone && !this._isValidTimezone(timezone)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid timezone provided.",
          isValidTimezones: ALL_TIMEZONES,
        });
      }

      const existingUsers = await UserRepository.findByUsernameOrEmail(
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

      const newUser = await UserRepository.createUser({
        name,
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
          const saveResult = await imageUtils.saveProfileImage(
            req.file.buffer,

            req.file.mimetype,

            userId
          );
          if (saveResult.success) {
            profileImageUrl = saveResult.url;
            await UserRepository.updateProfileImage(userId, profileImageUrl);
          } else {
            console.error("Image upload failed:", saveResult.error);
          }
        } catch (imageError) {
          console.error("Erro processando imagem:", imageError);
        }
      }

      const activationToken = crypto.randomBytes(12).toString("hex");
      const currentDateTime = this._getCurrentDateTime();
      await UserRepository.createEmailActivationToken(
        userId,
        activationToken,
        currentDateTime
      );

      // Atribuir plano padrão ao novo usuário
      try {
        await PlansManager.setDefaultPlanForNewUser(userId);
      } catch (planError) {
        console.error("Erro ao atribuir plano padrão:", planError);
        // Não bloqueamos a criação do usuário por causa disso
      }

      await welcome_message(name, email, username, activationToken);

      return res.status(201).json({
        status: "OK",
        message: `Welcome to Weave Notes ${name}! Check your email to activate your account.`,
        user: {
          id: userId,
          name,
          username,
          email,
          avatar_url: profileImageUrl,
          created_at: newUser[0].created_at,
        },
        redirect: "/auth/signin",
      });
    } catch (error) {
      console.error("An error occurred during registration:", error);
      return this._handleError(error, res, next);
    }
  }

  async getProfileImage(req, res) {
    try {
      // Usa userId do usuário logado
      const userId = req.user.userId;

      this._validateAuthentication(req, res);

      const user = await UserRepository.getProfileImage(userId);

      if (!user || !user.avatar_url) {
        return res.status(404).send("Profile image not found.");
      }

      // Redireciona para a URL da imagem
      return res.redirect(user.avatar_url);
    } catch (error) {
      console.error("Error retrieving profile image:", error);
      this._handleError(error, res);
    }
  }

  async getProfileImageInfo(req, res) {
    try {
      const userId = req.user.userId;

      this._validateAuthentication(req, res);

      const user = await UserRepository.getProfileImage(userId);

      if (!user || !user.avatar_url) {
        return res.status(404).json({
          error: "Profile image not found",
          hasImage: false,
        });
      }

      res.json({
        hasImage: true,
        userName: user.name,
        imageInfo: {
          url: user.avatar_url,
          isExternal: true,
          provider: "Digital Ocean Spaces",
        },
      });
    } catch (error) {
      console.error("Error retrieving profile image info:", error);
      this._handleError(error, res);
    }
  }

  async getProfile(req, res) {
    try {
      this._validateAuthentication(req, res);

      const user = await this.authRepository.findUserByUsername(
        req.user.username
      );

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      return res.status(200).json(
        userDataResponse(user)
      );

    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      this._handleError(error, res);
    }
  }

  // Atualização de perfil
  async updateProfile(req, res) {
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
    } = req.body;

    const auditChanges = {};

    try {
      const currentUser = await AuthRepository.findUserByUsername(
        req.user.username
      );

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (theme_mode && !["light", "dark"].includes(theme_mode)) {
        return res.status(400).json({ message: "Invalid theme mode" });
      }

      if (birth_date && isNaN(new Date(birth_date).getTime())) {
        return res.status(400).json({ message: "Invalid birth date format" });
      }

      if (
        (currentPassword && !newPassword) ||
        (!currentPassword && newPassword)
      ) {
        return res
          .status(400)
          .json({ message: "Both current and new passwords are required" });
      }

      if (emailValidationToken) {
        const tokenRecord = await UserRepository.findEmailChangeToken(
          req.user.userId,
          emailValidationToken
        );
        if (!tokenRecord)
          return res.status(400).json({ message: "Invalid or expired token" });

        const dataToUpdate = await UserRepository.getDataToUpdate(
          req.user.userId
        );
        if (dataToUpdate?.new_email) {
          await UserRepository.updateUserProfile(req.user.userId, {
            email: dataToUpdate.new_email,
          });
          await UserRepository.clearDataToUpdate(req.user.userId);
          await UserRepository.deactivateEmailToken(emailValidationToken);

          auditChanges.email_status = "verified_and_changed";
          auditChanges.new_email = dataToUpdate.new_email;
        }
      }

      let emailPendingValidation = false;
      let pendingEmail = null;

      if (
        email !== undefined &&
        email !== currentUser.email &&
        !emailValidationToken
      ) {
        const emailExists = await UserRepository.findByUsernameOrEmail(
          "",
          email
        );
        if (emailExists.length > 0)
          return res.status(400).json({ message: "Email already in use" });

        const token = crypto.randomBytes(10).toString("hex");
        await UserRepository.deactivateOldEmailTokens(req.user.userId);
        await UserRepository.createEmailChangeToken(
          req.user.userId,
          token,
          email,
          getCurrentDateTime()
        );

        const emailResult = await sendEmailChangeValidation(
          currentUser.email,
          email,
          token
        );
        if (!emailResult.success)
          return res
            .status(500)
            .json({ message: "Error sending validation email" });

        emailPendingValidation = true;
        pendingEmail = email;

        auditChanges.email_request = "pending_validation";
        auditChanges.requested_email = email;
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (theme_mode !== undefined) updates.theme_mode = theme_mode;
      if (birth_date !== undefined) updates.birth_date = birth_date;
      if (phone_number !== undefined) updates.phone_number = phone_number;
      if (private_profile !== undefined)
        updates.private_profile = private_profile;

      if (username !== undefined && username !== currentUser.username) {
        const usernameExists = await UserRepository.findByUsernameOrEmail(
          username,
          ""
        );
        if (usernameExists.length > 0)
          return res.status(400).json({ message: "Username already in use" });
        updates.username = username;
      }

      let updatedUser = currentUser;
      if (Object.keys(updates).length > 0) {
        updatedUser = await UserRepository.updateUserProfile(
          req.user.userId,
          updates
        );
        Object.assign(auditChanges, updates);
      }

      let avatarUrl = updatedUser.avatar_url;
      if (req.file?.buffer) {
        const uploadResult = await imageUtils.saveProfileImage(
          req.file.buffer,
          req.file.mimetype,
          req.user.userId
        );
        if (uploadResult.success) {
          const updateImage = await UserRepository.updateProfileImage(
            req.user.userId,
            uploadResult.url
          );
          avatarUrl = updateImage[0].avatar_url;
          auditChanges.avatar_updated = true;
        }
      }

      if (currentPassword && newPassword) {
        const match = await bcrypt.compare(
          currentPassword,
          currentUser.password
        );
        if (!match) {
          updateProfileLogs.createLog(
            req.user.userId,
            "security_change",
            req,
            "failure",
            { reason: "wrong_current_password" }
          );
          return res
            .status(401)
            .json({ message: "Current password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        await UserRepository.updateUserPassword(
          req.user.userId,
          hashedPassword
        );

        auditChanges.password_changed = true;
        updateProfileLogs.createLog(
          req.user.userId,
          "security_change",
          req,
          "success",
          { action: "password_update" }
        );
      }

      const response = {
        userDataResponse(user),
        message: "Profile updated successfully",
      };

      if (emailPendingValidation) {
        response.email_validation = {
          pending: true,
          pending_email: pendingEmail,
        };
      }

      if (Object.keys(auditChanges).length > 0) {
        updateProfileLogs.createLog(
          req.user.userId,
          "profile_update",
          req,
          "success",
          auditChanges
        );
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error updating profile:", error);

      updateProfileLogs.createLog(
        req.user?.userId,
        "system_error",
        req,
        "failure",
        {
          error: error.message,
          context: "updateProfile",
        }
      );

      this._handleError(error, res);
    }
  }

  async deleteUser(req, res) {
    try {
      const userId = req.user.userId;

      const userData = await UserRepository.findById(userId);

      if (!userData) {
        return res.status(404).json({
          error: "User not found",
          message: "User does not exist.",
        });
      }

      const result = await UserRepository.deleteUser(userId);

      if (result && result.length > 0) {
        try {
          await delete_account_notification(
            userData.name,
            userData.email,
            userData.username
          );
        } catch (emailError) {
          console.error("Failed to send delete account email:", emailError);
        }

        res.status(200).json({ message: "User deleted successfully." });
      } else {
        res.status(404).json({
          error: "User not found",
          message: "User does not exist or has already been deleted.",
        });
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      this._handleError(error, res);
    }
  }

  async activateAccount(req, res) {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Activation token is required" });
    }

    try {
      const tokenRecord = await UserRepository.findEmailActivationToken(token);

      if (!tokenRecord) {
        return res
          .status(400)
          .json({ message: "Invalid or expired activation token" });
      }

      // Verifica o email
      const verifiedUser = await UserRepository.verifyUserEmail(
        tokenRecord.user_id
      );

      if (!verifiedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Desativa o token
      await UserRepository.deactivateEmailToken(token);

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
      console.error("Error activating account:", error);
      this._handleError(error, res);
    }
  }

  /**
   * GET /api/users/search - Buscar usuários para adicionar como colaboradores
   * Busca usuários por email, username, ou nome
   */
  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de query
      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          error: "The search query must be at least 2 characters long.",
        });
      }

      const searchTerm = q.trim();

      const users = await this.userRepository.searchUsers(searchTerm);

      const filteredUsers = users
        .filter((user) => user && user.user_id !== userId)
        .map((user) => ({
          id: user.user_id,
          username: user.username,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        }));

      res.status(200).json({
        users: filteredUsers,
        query: searchTerm,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new userController();
