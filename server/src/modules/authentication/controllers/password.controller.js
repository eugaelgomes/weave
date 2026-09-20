const crypto = require("crypto");
const bcrypt = require("bcrypt");

const { fromUnknown } = require("@/errors");
const PasswordRepository = require("@/modules/authentication/repositories/password.repository");
const { mail_rescue_pass } = require("@/services/email/templates/rescue-password");
const { sessionStore } = require("@/middlewares/http/session");

class PasswordController {
  /**
   * Request password reset link (forgot password)
   */
  async forgotPassword(req, res) {
    const email = req.body.email;

    try {
      const userExists = await PasswordRepository.findUserByEmail(email);

      if (!userExists) {
        return res.status(400).json({ message: "User not found." });
      }

      // Check if email_verified is true
      if (!userExists.email_verified) {
        return res.status(403).json({
          email_verified: false,
          message: "Email not verified. Please activate your account first.",
        });
      }

      const token = crypto.randomBytes(10).toString("hex");

      // Deactivate old tokens
      await PasswordRepository.deactivateOldTokens(userExists.user_id);

      // New 1h token
      await PasswordRepository.createToken(userExists.user_id, token);

      const emailResult = await mail_rescue_pass(email, token, userExists.name);

      if (!emailResult.success) {
        console.error("Forgot password email provider error:", emailResult.error || "unknown");
        return res.status(500).json({
          message:
            process.env.NODE_ENV === "development"
              ? `Error sending email: ${emailResult.error || "unknown error"}`
              : "Error sending email. Please try again.",
        });
      }

      // Return response on success
      return res.status(202).json({
        message:
          "Recovery instructions sent to your email. Please check your inbox and spam folder. If you do not receive the email within a few minutes, try again.",
        status: "OK",
      });
    } catch (error) {
      console.error("Error recovering password:", error);
      return res.status(500).json({
        message: "Error processing request. Please try again later.",
      });
    }
  }

  /**
   * Reset user password using token
   */
  async resetPassword(req, res, next) {
    const { token, password: newPassword } = req.body;

    try {
      const tokenRecord = await PasswordRepository.findTokenByValue(token);
      if (!tokenRecord) {
        return res.status(400).json({
          message: "Invalid token, please try again.",
        });
      }

      // Find the user by the ID associated with the token
      const userExists = await PasswordRepository.findUserById(tokenRecord.user_id);

      if (!userExists) {
        return res.status(400).json({
          message: "Email not found.",
        });
      }

      const hashedPassword = await bcrypt.hash(
        newPassword,
        parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
      );

      await PasswordRepository.updateUserPassword(userExists.user_id, hashedPassword);
      await PasswordRepository.deactivateToken(token);
      await sessionStore.destroyUserSessions(userExists.user_id);
      return res.status(200).json({
        message: "Password updated successfully!",
        status: "OK",
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }
}

module.exports = new PasswordController();
