const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const UserRepository = require("@/repositories/users");
const AuthRepository = require("@/repositories/authentication");
const welcomeMailModule = require("@/services/email/templates/welcome/welcome-mail");
const deleteAccountModule = require("@/services/email/templates/delete/delete-account-message");
const emailChangeModule = require("@/services/email/templates/access/email-change-validation");
const imageUtils = require("@/middlewares/data/image-utils");
const { welcome_message } = welcomeMailModule;
const { delete_account_notification } = deleteAccountModule;
const { sendEmailChangeValidation } = emailChangeModule;

const saltRounds = 12;

const getCurrentDateTime = () => {
  const data = new Date();
  return data.toISOString().slice(0, 19).replace("T", " ");
};

const getCreationDate = () => {
  return getCurrentDateTime();
};

class UserController {
  async createUser(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let { name, username, email, password } = req.body;
      password = await bcrypt.hash(password, saltRounds);
      const createdAt = getCreationDate();

      const existingUsers = await UserRepository.findByUsernameOrEmail(
        username,
        email
      );

      if (
        existingUsers.some(
          (user) => user.email === email && user.usuario === username
        )
      ) {
        return res.status(401).send("User and email already exists!");
      } else if (existingUsers.some((user) => user.email === email)) {
        return res.status(401).send("Email is already in use!");
      } else if (existingUsers.some((user) => user.usuario === username)) {
        return res.status(401).send("Username is already in use!");
      }

      const newUser = await UserRepository.createUser(
        name,
        username,
        email,
        password,
        null,
        createdAt
      );

      let profileImageUrl = null;
      const userId = newUser[0].user_id; // Corrige acesso ao ID

      // Se tiver imagem, salva usando o id retornado pelo banco
      if (req.file && req.file.buffer) {
        try {
          const saveResult = await imageUtils.saveProfileImage(
            req.file.buffer,
            req.file.mimetype,
            userId
          );

          if (saveResult.success) {
            profileImageUrl = saveResult.url;

            // Insere url
            const updateResult = await UserRepository.updateProfileImage(
              userId,
              profileImageUrl
            );

            if (updateResult && updateResult.length > 0) {
              console.log(
                `Avatar URL atualizado no banco para usuário ${userId}: ${profileImageUrl}`
              );
            } else {
              console.error(
                `Falha ao atualizar avatar URL no banco para usuário ${userId}`
              );
            }
          } else {
            throw new Error("Failed to upload to Digital Ocean Spaces");
          }
        } catch (imageError) {
          console.error("Erro ao fazer upload da imagem:", imageError);
          return res.status(500).json({
            error: "Image upload failed",
            message:
              "Unable to upload the image to Digital Ocean Spaces. Please try again.",
          });
        }
      }

      // Envia email de boas-vindas
      const mailResult = await welcome_message(name, email, username);
      if (!mailResult.success) {
        console.warn("Welcome email not sent:", mailResult.error);
      }

      res.status(201).json({
        message: "User registered successfully!",
      });
    } catch (error) {
      console.error("An error occurred during the process", error);
      res
        .status(500)
        .send(
          "An internal error occurred. Please try again later or contact support."
        );
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
        }
      });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  }

  async updateProfile(req, res) {
    const { name, username, email, emailValidationToken, currentPassword, newPassword, theme_mode, birth_date, phone_number, private_profile } = req.body;
    try {
      const currentUser = await AuthRepository.findUserByUsername(req.user.username);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      let emailPendingValidation = false;
      let pendingEmail = null;

      // 1) Se veio token de email, valida e aplica o novo email primeiro
      if (emailValidationToken) {
        const tokenRecord = await UserRepository.findEmailChangeToken(req.user.userId, emailValidationToken);
        
        if (!tokenRecord) {
          return res.status(400).json({ message: "Invalid or expired token" });
        }

        const dataToUpdate = await UserRepository.getDataToUpdate(req.user.userId);
        if (!dataToUpdate || !dataToUpdate.new_email) {
          return res.status(400).json({ message: "No pending email change" });
        }

        // Aplica o novo email
        const emailUpdate = { email: dataToUpdate.new_email };
        await UserRepository.updateUserProfile(req.user.userId, emailUpdate);
        await UserRepository.clearDataToUpdate(req.user.userId);
        await UserRepository.deactivateEmailToken(emailValidationToken);
      }

      // 2) Se veio email sem token, prepara validação mas continua com outros updates
      if (email !== undefined && email !== currentUser.email && !emailValidationToken) {
        // Verifica se o novo email já está em uso
        const emailExists = await UserRepository.findByUsernameOrEmail("", email);
        if (emailExists.length > 0) {
          return res.status(400).json({ message: "Email already in use" });
        }

        // Gera token e salva novo email em data_to_update (na tabela tokens)
        const token = crypto.randomBytes(10).toString("hex");
        const currentDateTime = getCurrentDateTime();

        await UserRepository.deactivateOldEmailTokens(req.user.userId);
        await UserRepository.createEmailChangeToken(req.user.userId, token, email, currentDateTime);

        // Envia email de validação
        const emailResult = await sendEmailChangeValidation(currentUser.email, email, token);
        
        if (!emailResult.success) {
          return res.status(500).json({ message: "Error sending validation email" });
        }

        emailPendingValidation = true;
        pendingEmail = email;
        // Continua para atualizar outros campos
      }

      // 3) Atualiza dados básicos que foram enviados (email direto NÃO é permitido)
      const updates = {};
      if (name !== undefined) updates.name = name;
      if (username !== undefined) updates.username = username;
      if (theme_mode !== undefined) updates.theme_mode = theme_mode;
      if (birth_date !== undefined) updates.birth_date = birth_date;
      if (phone_number !== undefined) updates.phone_number = phone_number;
      if (private_profile !== undefined) updates.private_profile = private_profile;

      let updatedUser = null;
      if (Object.keys(updates).length > 0) {
        updatedUser = await UserRepository.updateUserProfile(
          req.user.userId,
          updates
        );
        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }
      } else {
        // Se não há updates, busca dados atuais
        updatedUser = await AuthRepository.findUserByUsername(req.user.username);
      }

      // 4) Se veio arquivo de imagem, faz upload e atualiza avatar_url
      let avatarUrl = updatedUser.avatar_url || null;
      if (req.file && req.file.buffer) {
        const uploadResult = await imageUtils.saveProfileImage(
          req.file.buffer,
          req.file.mimetype,
          req.user.userId
        );
        if (!uploadResult.success) {
          return res.status(500).json({
            message: "Image upload failed",
            error: uploadResult.error,
          });
        }

        const updateImage = await UserRepository.updateProfileImage(
          req.user.userId,
          uploadResult.url
        );
        if (updateImage && updateImage.length > 0) {
          avatarUrl = updateImage[0].avatar_url;
        }
      }

      // 5) Se veio senha, valida e atualiza
      if (currentPassword && newPassword) {
        const user = await AuthRepository.findUserByUsername(
          updatedUser.username
        );
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
          return res
            .status(401)
            .json({ message: "Current password is incorrect" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await UserRepository.updateUserPassword(
          req.user.userId,
          hashedPassword
        );
      }

      // 6) Monta resposta com dados atualizados
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
        message: "Profile updated successfully"
      };

      // Se há email pendente de validação, adiciona informação
      if (emailPendingValidation) {
        response.email_validation = {
          pending: true,
          pending_email: pendingEmail,
          message: "Validation email sent. Please check your new email and provide the token to complete the change."
        };
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error updating profile:", error);
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
}

module.exports = new UserController();
