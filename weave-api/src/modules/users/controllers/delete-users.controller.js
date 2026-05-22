const BaseController = require("./base.controller");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const DeleteUsersRepository = require("@/modules/users/repositories/delete-users.repository");
const {
  delete_account_notification,
} = require("@/services/email/templates/delete-account-message");
const {
  delete_account_request,
} = require("@/services/email/templates/delete-account-request");
const crypto = require("crypto");

/**
 * Fluxo de exclusão de conta (solicitação por e-mail e confirmação por token).
 */
class DeleteUsersController extends BaseController {
  /**
   * Gera token de exclusão e envia e-mail de confirmação ao usuário autenticado.
   *
   * @param {import('express').Request & { user: { userId: string|number } }} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async requestDeleteUser(req, res, next) {
    try {
      const userId = req.user.userId;

      const userData = await SearchUsersRepository.findById(userId);

      if (!userData) {
        return res.status(404).json({
          error: "User not found",
          message: "User does not exist.",
        });
      }

      const token = crypto.randomBytes(12).toString("hex");

      const result = await DeleteUsersRepository.createDeleteAccountToken(
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
              "Failed to send confirmation email. Please try again later.",
          });
        }

        res.status(200).json({
          status: "OK",
          message:
            "Confirmation email sent. Please check your inbox to confirm account deletion.",
        });
      } else {
        res.status(500).json({
          error: "Token error",
          message: "Failed to generate deletion token.",
        });
      }
    } catch (error) {
      console.error("Erro ao solicitar exclusão da conta:", error);
      this._handleError(error, res, next);
    }
  }

  /**
   * Confirma exclusão definitiva da conta a partir do `token` recebido por e-mail.
   *
   * @param {import('express').Request & { body: { token?: string } }} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async confirmDeleteUser(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: "Validation error",
          message: "Token is required.",
        });
      }

      const tokenData =
        await DeleteUsersRepository.findDeleteAccountToken(token);

      if (!tokenData) {
        return res.status(400).json({
          error: "Invalid token",
          message: "Invalid or expired token.",
        });
      }

      const userId = tokenData.user_id;
      const userData = await SearchUsersRepository.findById(userId);

      if (!userData) {
        return res.status(404).json({
          error: "User not found",
          message: "User does not exist.",
        });
      }

      // Desativa o token
      await DeleteUsersRepository.deactivateDeleteAccountToken(token);

      // Deleta o usuário
      const deleteResult = await DeleteUsersRepository.deleteUser(userId);

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
          message: "Account deleted successfully.",
        });
      } else {
        res.status(500).json({
          error: "Deletion error",
          message: "Failed to delete account.",
        });
      }
    } catch (error) {
      console.error("Erro ao confirmar exclusão da conta:", error);
      this._handleError(error, res, next);
    }
  }
}
module.exports = new DeleteUsersController();
