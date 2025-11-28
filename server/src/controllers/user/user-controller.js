const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const UserRepository = require("@/repositories/user-manager");
const welcomeMailModule = require("@/services/email/templates/welcome/welcome-mail");
const deleteAccountModule = require("@/services/email/templates/delete_account/delete_user");
const imageUtils = require("@/middlewares/data/image-utils");
const { welcome_message } = welcomeMailModule;
const { delete_account_notification } = deleteAccountModule;

const saltRounds = 12;

const getCreationDate = () => {
  const data = new Date();
  return data.toISOString().slice(0, 19).replace("T", " ");
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

      // 1. Cria o usuário sem imagem
      const newUser = await UserRepository.createUser(
        name,
        username,
        email,
        password,
        null, // ainda sem imagem
        createdAt
      );

      let profileImageUrl = null;
      const userId = newUser[0].user_id; // Corrige o acesso ao ID

      // 2. Se tiver imagem, salva usando o id retornado pelo banco
      if (req.file && req.file.buffer) {
        try {
          const saveResult = await imageUtils.saveProfileImage(
            req.file.buffer,
            req.file.mimetype,
            userId // agora já existe id no banco
          );

          if (saveResult.success) {
            profileImageUrl = saveResult.url;

            // 3. Atualiza o usuário com a URL da imagem
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
      // Usa diretamente o userId do token do usuário logado
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
