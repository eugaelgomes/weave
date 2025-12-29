// Biblioteca de encriptação
const bcrypt = require("bcrypt");
const crypto = require("crypto");
// Validadores de dados
const { validationResult } = require("express-validator");
const imageUtils = require("@/middlewares/data/image-utils");
// Repositórios
const UserRepository = require("@/repositories/users");
const AuthRepository = require("@/repositories/authentication");
// Emails
const welcomeMailModule = require("@/services/email/templates/welcome-mail");
const deleteAccountModule = require("@/services/email/templates/delete-account");
const emailChangeModule = require("@/services/email/templates/users-access/reset-password");
const { welcome_message } = welcomeMailModule;
const { delete_account_notification } = deleteAccountModule;
const { sendEmailChangeValidation } = emailChangeModule;

const updateProfileLogs = require("@/utils/system_logs/update_profile-logs");

const allTimezones = Intl.supportedValuesOf("timeZone");

const saltRounds = 12;

const getCurrentDateTime = () => {
  const data = new Date();
  return data.toISOString().slice(0, 19).replace("T", " ");
};

const validTimezones = (timezone) => {
  return allTimezones.includes(timezone);
};

class UserController {
  async createUser(req, res) {
    // Validação de entrada nula
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

      if (timezone && !validTimezones(timezone)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid timezone provided.",
          validTimezones: allTimezones,
        });
      }

      const existingUsers = await UserRepository.findByUsernameOrEmail(
        username,
        email
      );

      if (existingUsers.length > 0) {
        const emailExists = existingUsers.some((u) => u.email === email);
        const userExists = existingUsers.some((u) => u.usuario === username);

        if (emailExists && userExists)
          return res.status(409).json({
            status: "failed",
            message: "User and email already exist!",
          });
        if (emailExists)
          return res.status(409).json({
            status: "failed",
            message: "Email is already in use! Try another.",
          });
        if (userExists)
          return res.status(409).json({
            status: "failed",
            message: "Username is already in use! Try another.",
          });
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
      const currentDateTime = getCurrentDateTime();
      await UserRepository.createEmailActivationToken(
        userId,
        activationToken,
        currentDateTime
      );

      const mailResult = await welcome_message(
        name,
        email,
        username,
        activationToken
      );
      if (!mailResult.success) {
        console.warn("Welcome email not sent:", mailResult.error);
      }

      return res.status(201).json({
        status: "success",
        message:
          "User registered successfully! Please check your email to activate your account.",
        user_data: {
          id: userId,
          name,
          username,
          email,
        },
        redirect: "/auth/signin",
      });
    } catch (error) {
      console.error("An error occurred during registration:", error);
      return res.status(500).send("An internal error occurred.");
    }
  }

  //async getAllUsers(req, res) {
  //  try {
  //    const users = await UserRepository.findAll();
  //    res.status(200).json(users);
  //  } catch (error) {
  //    res.status(500).send("Internal server error.");
  //  }
  //}

  async getProfileImage(req, res) {
    try {
      // Usa diretamente o userId do token do usuário logado
      const userId = req.user.userId;

      const user = await UserRepository.getProfileImage(userId);

      if (!user || !user.avatar_url) {
        return res.status(404).send("Profile image not found.");
      }

      // Redireciona para a URL da imagem
      return res.redirect(user.avatar_url);
    } catch (error) {
      console.error("Error retrieving profile image:", error);
      res.status(500).send("Internal server error.");
    }
  }

  async getProfileImageInfo(req, res) {
    try {
      const userId = req.user.userId;

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
      res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await AuthRepository.findUserByUsername(req.user.username);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      return res.status(200).json({
        user_data: {
          profile: {
            id: user.user_id,
            name: user.name,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            birth_date: user.birth_date,
            phone_numer: user.phone_number,
            created_at: user.created_at,
            updated_at: user.updated_at,
          },
          settings: {
            theme_mode: user.theme_mode,
            private_profile: user.private_profile,
            auth_with_google: user.auth_with_google,
          },
          organization: {
            id: user.org_id,
            unique_name: user.org_unique_name,
            name: user.org_name,
          },
        },
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
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
        user_data: {
          profile: {
            id: updatedUser.user_id,
            name: updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            avatar_url: avatarUrl,
            birth_date: updatedUser.birth_date,
            phone_number: updatedUser.phone_number,
            created_at: updatedUser.created_at,
          },
          settings: {
            theme_mode: updatedUser.theme_mode,
            private_profile: updatedUser.private_profile,
          },
        },
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

      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async deleteUser(req, res) {
    try {
      // Usa diretamente o userId do token do usuário logado
      const userId = req.user.userId;

      // Busca os dados do usuário antes de excluir para enviar o email
      const userData = await UserRepository.findById(userId);

      if (!userData) {
        return res.status(404).json({
          error: "User not found",
          message: "User does not exist.",
        });
      }

      const result = await UserRepository.deleteUser(userId);

      // Verifica se o usuário foi realmente deletado
      if (result && result.length > 0) {
        // Envia email de confirmação de exclusão
        try {
          await delete_account_notification(
            userData.name,
            userData.email,
            userData.username
          );
          console.log(`Delete account email sent to: ${userData.email}`);
        } catch (emailError) {
          console.error("Failed to send delete account email:", emailError);
          // Não falha a operação se o email não for enviado
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
      res.status(500).json({ error: "Internal server error." });
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
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = new UserController();
