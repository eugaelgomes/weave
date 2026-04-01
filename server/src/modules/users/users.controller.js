const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const spacesService = require("@/services/storage");
const { presignObjectFields } = require("@/utils/data/presign-storage-files");

// Repositórios
const UserRepository = require("@/modules/users/users.repository");
const AuthRepository = require("@/modules/authentication/auth.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");

// Serviços de Email e Logs
const welcomeMailModule = require("@/services/email/templates/welcome-mail");
const {
  delete_account_notification,
} = require("@/services/email/templates/delete-account/deleted-account-message");
const {
  sendEmailChangeValidation,
} = require("@/services/email/templates/users-access/reset-password");
const {
  delete_account_request,
} = require("@/services/email/templates/delete-account/delete-account-request");
const updateProfileLogs = require("@/utils/system_logs/update_profile-logs");
const PlansManager = require("@/services/plans/manager");
const { normalizeAppPreferences } = require("@/modules/users/normalize");
const { stat } = require("fs");

const { welcome_message } = welcomeMailModule;

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
const ALL_TIMEZONES = Intl.supportedValuesOf("timeZone");

const mapDefaultAreaInfo = (defaultAreaData) => {
  if (!defaultAreaData) {
    return null;
  }

  return {
    id: defaultAreaData.org_default_area_id,
    name: defaultAreaData.org_default_area_name,
    slug: defaultAreaData.org_default_area_slug,
    role: defaultAreaData.org_default_area_role,
    member_since: defaultAreaData.org_default_area_member_since,
    description: defaultAreaData.org_default_area_description,
    properties: defaultAreaData.org_default_area_properties || {},
  };
};

const mapOrganizationInfo = (organizationData) => {
  if (!organizationData) {
    return null;
  }

  return {
    id: organizationData.org_id,
    unique_name: organizationData.org_unique_name,
    name: organizationData.org_name,
    logo_url: organizationData.org_logo_url,
    member_role: organizationData.org_member_role,
    member_since: organizationData.org_member_since,
  };
};

const mapPlanUsageInfo = (usageData) => {
  if (!usageData) {
    return null;
  }

  return {
    plan_id: usageData.usage_plan_id,
    plan_name: usageData.usage_plan_name,
    client_type: usageData.usage_client_type,
    period_start: usageData.period_start,
    period_end: usageData.period_end,
    details: usageData.usage_details || {},
  };
};

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

  /**
   * Endpoint de criação de novos usuários (Sign up).
   * Valida username, email, gera os tokens e envia o e-mail de Welcome.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
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
        timezone = null,
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
                "Este endereço de e-mail pertence a um domínio corporativo. Você precisa de um convite da organização para criar uma conta.",
            });
          }
        }
      }

      // Usa user_name se fornecido, senão usa name
      const userName = user_name || name;

      if (!userName) {
        return res.status(400).json({
          status: "error",
          message: "Nome é obrigatório.",
        });
      }

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

  /**
   * Retorna os dados completos do próprio perfil do usuário logado (Meu Perfil)
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getProfile(req, res) {
    try {
      this._validateAuthentication(req, res);

      const user = await this.authRepository.findUserByUsername(
        req.user.username
      );

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const organization = mapOrganizationInfo(user.organization);
      const defaultArea = mapDefaultAreaInfo(user.default_area);
      const planUsage = mapPlanUsageInfo(user.current_usage);

      // Gerar URLs pré-assinadas para evitar acesso não autorizado e direto ao S3
      // A duração de 12 horas mantém a imagem visível no frontend pelo mesmo tempo de vida de uma sessão normal (embora ela use os cookies do next/auth)
      const protectedUser = await presignObjectFields(
        user,
        ["avatar_url"],
        {
          expiresIn: 12 * 60 * 60,
          userId: req.user.userId,
        }
      );
      const protectedOrg = organization
        ? await presignObjectFields(organization, ["logo_url"], {
            expiresIn: 12 * 60 * 60,
            userId: req.user.userId,
          })
        : null;

      return res.status(200).json({
        user: {
          user_profile: {
            id: protectedUser.user_id,
            user_name: protectedUser.user_name,
            username: protectedUser.username,
            email: protectedUser.email,
            avatar_url: protectedUser.avatar_url,
            birth_date: protectedUser.birth_date,
            phone_number: protectedUser.phone_number,
            created_at: protectedUser.created_at,
            updated_at: protectedUser.updated_at,
          },
          user_settings: {
            theme_mode: protectedUser.theme_mode,
            private_profile: protectedUser.private_profile,
            auth_with_google: protectedUser.auth_with_google,
          },
          user_organization: {
            id: protectedOrg?.id || null,
            unique_name: protectedOrg?.unique_name || null,
            name: protectedOrg?.name || null,
            logo_url: protectedOrg?.logo_url || null,
            member_role: protectedOrg?.member_role || null,
            member_since: protectedOrg?.member_since || null,
            default_area: defaultArea,
          },
          current_plan: {
            id: user.plan_id,
            plan_name: user.plan_name,
            client_type: planUsage?.client_type || null,
            details: user.plan_details || {},
          },
          current_plan_usage: planUsage,
          usage_preference: user.user_preference || {},
        },
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      this._handleError(error, res);
    }
  }

  /**
   * Atualização de dados cadastrais e preferências de perfil do usuário.
   * Utiliza tokens no caso de troca de e-mail.
   *
   * @param {import('express').Request} req Onde req.body contém os itens a serem atualizados.
   * @param {import('express').Response} res
   */
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
      usage_preference,
      user_preference,
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
        const uploadResult = await spacesService.uploadProfileImage(
          req.file.buffer,
          req.file.mimetype,
          req.user.userId
        );
        if (uploadResult.success) {
          const updateImage = await UserRepository.updateProfileImage(
            req.user.userId,
            uploadResult.key
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

      const mockUserForPresign = { avatar_url: avatarUrl };
      const protectedMock = await presignObjectFields(
        mockUserForPresign,
        ["avatar_url"],
        {
          expiresIn: 12 * 60 * 60,
          userId: req.user.userId,
        }
      );

      const response = {
        user: {
          user_profile: {
            id: updatedUser.user_id,
            user_name: updatedUser.user_name || updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            avatar_url: protectedMock.avatar_url,
            birth_date: updatedUser.birth_date,
            phone_number: updatedUser.phone_number,
          },
          user_settings: {
            theme_mode: updatedUser.theme_mode,
            private_profile: updatedUser.private_profile,
          },
          usage_preference: updatedUser.user_preference || {},
        },
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

  async requestDeleteUser(req, res) {
    try {
      const userId = req.user.userId;

      const userData = await UserRepository.findById(userId);

      if (!userData) {
        return res.status(404).json({
          error: "User not found",
          message: "Usuário não existe.",
        });
      }

      const token = crypto.randomBytes(12).toString("hex");

      const result = await UserRepository.createDeleteAccountToken(
        userId,
        token
      );

      if (result && result.length > 0) {
        try {
          await delete_account_request(
            userData.name,
            userData.email,
            userData.username,
            token
          );
        } catch (emailError) {
          console.error("Falha ao enviar email para:", emailError);
          return res.status(500).json({
            error: "Email error",
            message:
              "Falha ao enviar email de confirmação. Por favor, tente novamente.",
          });
        }

        res.status(200).json({
          status: "OK",
          message:
            "Email de confirmação enviado. Por favor, verifique sua caixa de entrada para confirmar a exclusão da conta.",
        });
      } else {
        res.status(500).json({
          error: "Token error",
          message: "Falha ao gerar token de exclusão.",
        });
      }
    } catch (error) {
      console.error("Erro ao solicitar exclusão da conta:", error);
      this._handleError(error, res);
    }
  }

  async confirmDeleteUser(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: "Validation error",
          message: "Token é obrigatório.",
        });
      }

      const tokenData = await UserRepository.findDeleteAccountToken(token);

      if (!tokenData) {
        return res.status(400).json({
          error: "Invalid token",
          message: "Token inválido ou expirado.",
        });
      }

      const userId = tokenData.user_id;
      const userData = await UserRepository.findById(userId);

      if (!userData) {
        return res.status(404).json({
          error: "User not found",
          message: "Usuário não existe.",
        });
      }

      // Desativa o token
      await UserRepository.deactivateDeleteAccountToken(token);

      // Deleta o usuário
      const deleteResult = await UserRepository.deleteUser(userId);

      if (deleteResult && deleteResult.length > 0) {
        try {
          await delete_account_notification(
            userData.name,
            userData.email,
            userData.username
          );
        } catch (emailError) {
          console.error(
            "Falha ao enviar email de confirmação de exclusão:",
            emailError
          );
        }

        res.status(200).json({
          status: "OK",
          message: "Conta excluída com sucesso.",
        });
      } else {
        res.status(500).json({
          error: "Deletion error",
          message: "Falha ao excluir a conta.",
        });
      }
    } catch (error) {
      console.error("Erro ao confirmar exclusão da conta:", error);
      this._handleError(error, res);
    }
  }

  async activateAccount(req, res) {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ message: "Token de ativação é obrigatório" });
    }

    try {
      const tokenRecord = await UserRepository.findEmailActivationToken(token);

      if (!tokenRecord) {
        return res
          .status(400)
          .json({ message: "Token de ativação inválido ou expirado" });
      }

      // Verifica o email
      const verifiedUser = await UserRepository.verifyUserEmail(
        tokenRecord.user_id
      );

      if (!verifiedUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Desativa o token
      await UserRepository.deactivateEmailToken(token);

      return res.status(200).json({
        message: "Email verificado com sucesso",
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

  /**
   * GET /users/search - Buscar usuários para adicionar como colaboradores
   */
  async searchUsers(req, res, next) {
    try {
      const { q } = req.query;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!q || q.trim().length < 3) {
        return res.status(400).json({
          error: "The search query must be at least 3 characters long.",
        });
      }

      const searchTerm = q.trim();

      const search_users = await this.userRepository.searchUsers(searchTerm);

      const filteredUsers = search_users
        .filter((user) => user && user.user_id !== userId)
        .map((user) => ({
          id: user.user_id,
          username: user.username,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
        }));

      res.status(200).json({
        search_users_query: searchTerm,
        search_users: filteredUsers,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new userController();
