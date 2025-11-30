const express = require("express");
const { body } = require("express-validator");

const PasswordController = require("@/controllers/password-manager/password-controller");

const router = express.Router();

// Start password recovery process
router.post(
  "/forgot-password",
  [body("email").isEmail()],
  PasswordController.forgotPassword.bind(PasswordController)
);

// Reset password using the token sent by email
router.post(
  "/reset-password",
  PasswordController.resetPassword.bind(PasswordController)
);

module.exports = router;
