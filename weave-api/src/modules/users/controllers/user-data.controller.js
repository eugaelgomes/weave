const spacesService = require("@/services/storage");

const BaseController = require("./base.controller");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const UserDataRepository = require("@/modules/users/repositories/user-data.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const { presignObjectFields } = require("@/utils/data/presign-storage-files");
const {
  sendEmailChangeValidation,
} = require("@/services/email/templates/reset-password");
const updateProfileLogs = require("@/utils/system_logs/update_profile-logs");
const { normalizeAppPreferences } = require("@/modules/users/normalize");

/**
 * @typedef {import('express').Request & {
 *   user: { userId: string|number, username: string },
 *   body?: Record<string, unknown>,
 *   file?: { buffer: Buffer, mimetype: string }
 * }} UserDataRequest
 */

/**
 * @param {Record<string, unknown>|null|undefined} defaultAreaData
 * @returns {null|{
 *   id: unknown,
 *   name: unknown,
 *   slug: unknown,
 *   role: unknown,
 *   member_since: unknown,
 *   description: unknown,
 *   properties: Record<string, unknown>
 * }}
 */
const mapDefaultAreaInfo = (defaultAreaData) => {
  if (!defaultAreaData) return null;
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

/**
 * @param {Record<string, unknown>|null|undefined} organizationData
 * @returns {null|{
 *   id: unknown,
 *   unique_name: unknown,
 *   name: unknown,
 *   logo_url: unknown,
 *   member_role: unknown,
 *   member_since: unknown
 * }}
 */
const mapOrganizationInfo = (organizationData) => {
  if (!organizationData) return null;
  return {
    id: organizationData.org_id,
    public_id: organizationData.org_public_id,
    unique_name: organizationData.org_unique_name,
    name: organizationData.org_name,
    logo_url: organizationData.org_logo_url,
    member_role: organizationData.org_member_role,
    member_since: organizationData.org_member_since,
  };
};

/**
 * @param {Record<string, unknown>|null|undefined} usageData
 * @returns {null|{
 *   plan_id: unknown,
 *   plan_name: unknown,
 *   client_type: unknown,
 *   period_start: unknown,
 *   period_end: unknown,
 *   details: Record<string, unknown>
 * }}
 */
const mapPlanUsageInfo = (usageData) => {
  if (!usageData) return null;
  return {
    plan_id: usageData.usage_plan_id,
    plan_name: usageData.usage_plan_name,
    client_type: usageData.usage_client_type,
    period_start: usageData.period_start,
    period_end: usageData.period_end,
    details: usageData.usage_details || {},
  };
};

/**
 * Perfil do usuário autenticado: leitura, atualização e imagem.
 */
class UserDataController extends BaseController {
  /**
   * Redireciona para a URL da imagem de perfil do usuário logado.
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getProfileImage(req, res) {
    try {
      // Usa userId do usuário logado
      const userId = req.user.userId;

      this._validateAuthentication(req, res);

      const user = await UserDataRepository.getProfileImage(userId);

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

  /**
   * Retorna metadados da imagem de perfil (sem redirecionar).
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getProfileImageInfo(req, res) {
    try {
      const userId = req.user.userId;

      this._validateAuthentication(req, res);

      const user = await UserDataRepository.getProfileImage(userId);

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
   * Perfil completo (`/me`): dados de perfil, organização, plano e URLs pré-assinadas.
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getProfile(req, res) {
    try {
      this._validateAuthentication(req, res);

      const user = await this.signinRepository.findUserByUsername(
        req.user.username
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const organization = mapOrganizationInfo(user.organization);
      const defaultArea = mapDefaultAreaInfo(user.default_area);
      const planUsage = mapPlanUsageInfo(user.current_usage);

      // Gerar URLs pré-assinadas para evitar acesso não autorizado e direto ao S3
      // A duração de 12 horas mantém a imagem visível no frontend pelo mesmo tempo de vida de uma sessão normal (embora ela use os cookies do next/auth)
      const protectedUser = await presignObjectFields(user, ["avatar_url"], {
        expiresIn: 12 * 60 * 60,
        userId: req.user.userId,
      });
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
            public_id: protectedUser.public_user_id,
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
            public_id: protectedOrg?.public_id || null,
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
          usage_preference: normalizeAppPreferences(user.user_preference || {}),
        },
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      this._handleError(error, res);
    }
  }

  /**
   * Atualiza perfil, preferências, e-mail (com fluxo de validação), senha e avatar opcional (`profilePicture`).
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
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
      const currentUser = await this.signinRepository.findUserByUsername(
        req.user.username
      );

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const normalizedThemeMode =
        theme_mode !== undefined ? String(theme_mode).trim().toUpperCase() : undefined;

      if (normalizedThemeMode && !["LIGHT", "DARK"].includes(normalizedThemeMode)) {
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
        const tokenRecord = await UserTokensRepository.findEmailChangeToken(
          req.user.userId,
          emailValidationToken
        );
        if (!tokenRecord)
          return res.status(400).json({ message: "Invalid or expired token" });

        const dataToUpdate = await UserTokensRepository.getDataToUpdate(
          req.user.userId
        );
        if (dataToUpdate?.new_email) {
          await UserDataRepository.updateUserProfile(req.user.userId, {
            email: dataToUpdate.new_email,
          });
          await UserTokensRepository.clearDataToUpdate(req.user.userId);
          await UserTokensRepository.deactivateEmailToken(emailValidationToken);

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
        const emailExists = await SearchUsersRepository.findByUsernameOrEmail(
          "",
          email
        );
        if (emailExists.length > 0)
          return res.status(400).json({ message: "Email already in use" });

        const token = crypto.randomBytes(10).toString("hex");
        await UserTokensRepository.deactivateOldEmailTokens(req.user.userId);
        await UserTokensRepository.createEmailChangeToken(
          req.user.userId,
          token,
          email,
          this._getCurrentDateTime()
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
      if (normalizedThemeMode !== undefined) updates.theme_mode = normalizedThemeMode;
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
        const usernameExists =
          await SearchUsersRepository.findByUsernameOrEmail(username, "");
        if (usernameExists.length > 0)
          return res.status(400).json({ message: "Username already in use" });
        updates.username = username;
      }

      let updatedUser = currentUser;
      if (Object.keys(updates).length > 0) {
        updatedUser = await UserDataRepository.updateUserProfile(
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
          const updateImage = await UserDataRepository.updateProfileImage(
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

        const hashedPassword = await bcrypt.hash(
          newPassword,
          parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
        );
        await UserDataRepository.updateUserPassword(
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
            public_id: updatedUser.public_user_id,
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
}
module.exports = new UserDataController();
