const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const PasswordRepository = require("@/modules/password/password.repository");
const mail_rescue_pass = require("@/services/email/templates/users-access/rescue-password");

class PasswordController {
  // FORGOT PASSWORD
  async forgotPassword(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Invalid email", errors: errors.array() });
    }

    const email = req.body.email;

    try {
      const userExists = await PasswordRepository.findUserByEmail(email);

      if (!userExists) {
        return res.status(400).json({ message: "User not found." });
      }

      // Verificar se email_verified = true
      if (!userExists.email_verified) {
        return res.status(403).json({
          message: "Email not verified. Please activate your account first.",
          email_verified: false,
        });
      }

      const token = crypto.randomBytes(10).toString("hex");

      // Desativa tokens antigos
      await PasswordRepository.deactivateOldTokens(userExists.user_id);

      // Novo token 1h
      await PasswordRepository.createToken(userExists.user_id, token);

      const emailResult = await mail_rescue_pass(email, token, userExists.name);

      if (!emailResult.success) {
        return res.status(500).json({
          message: "Error sending email. Please try again.",
        });
      }

      // Retorno em caso 200
      return res.status(202).json({
        status: "OK",
        message:
          "Recovery instructions sent to your email. Please check your inbox and spam folder. If you do not receive the email within a few minutes, try again.",
      });
    } catch (error) {
      console.error("Error recovering password:", error);
      return res.status(500).json({
        message: "Error processing request. Please try again later.",
      });
    }
  }

  // RESERT PASSWORD
  async resetPassword(req, res) {
    const { token, password: newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required",
        received: {
          token: !!token,
          password: !!newPassword,
        },
      });
    }

    try {
      const tokenRecord = await PasswordRepository.findTokenByValue(token);
      if (!tokenRecord) {
        return res.status(400).json({
          message: "Invalid token, please try again.",
        });
      }

      // Busca o usuário pelo ID associado ao token
      const userExists = await PasswordRepository.findUserById(
        tokenRecord.user_id
      );

      if (!userExists) {
        return res.status(400).json({
          message: "Email not found.",
        });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await PasswordRepository.updateUserPassword(
        userExists.user_id,
        hashedPassword
      );
      await PasswordRepository.deactivateToken(token);
      return res.status(200).json({
        status: "OK",
        message: "Password updated successfully!",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error processing request",
        error: error.message,
      });
    }
  }
}

module.exports = new PasswordController();
