const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const PasswordRepository = require("@/repositories/password");
const mail_rescue_pass = require("@/services/email/templates/access/rescue-password-mail");

const getCurrentDateTimeUTCMinus3 = () => {
  const date = new Date();
  date.setHours(date.getHours() - 3);
  return date.toISOString().slice(0, 19).replace("T", " ");
};

class PasswordController {
  async forgotPassword(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Invalid email", errors: errors.array() });
    }

    const email = req.body.email;

    try {
      //console.log(`Verifying email existence: ${email}`);
      const userExists = await PasswordRepository.findUserByEmail(email);

      if (!userExists) {
        return res.status(400).json({ message: "User not found." });
      }

      // Verifica se o email foi validado
      if (!userExists.email_verified) {
        return res.status(403).json({
          message: "Email not verified. Please activate your account first.",
          email_verified: false,
        });
      }

      const token = crypto.randomBytes(10).toString("hex");
      const currentDateTime = getCurrentDateTimeUTCMinus3();

      // Desativa tokens antigos
      await PasswordRepository.deactivateOldTokens(userExists.user_id);

      // Insere novo token
      await PasswordRepository.createToken(
        userExists.user_id,
        token,
        currentDateTime
      );

      // Envia o email com o token
      const emailResult = await mail_rescue_pass(email, token);

      if (!emailResult.success) {
        return res.status(500).json({
          message: "Error sending email. Please try again.",
        });
      }

      return res.status(200).json({
        message: "Recovery instructions sent to your email.",
      });
    } catch (error) {
      console.error("Error recovering password:", error);
      return res.status(500).json({
        message: "Error processing request. Please try again later.",
      });
    }
  }

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
