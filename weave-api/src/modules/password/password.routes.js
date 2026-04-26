const express = require("express");
const { body } = require("express-validator");

const PasswordController = require("@/modules/password/password.controller");

const router = express.Router();

router.post(
  "/forgot-password",
  [body("email").isEmail()],
  PasswordController.forgotPassword.bind(PasswordController)
);

router.post(
  "/reset-password",
  PasswordController.resetPassword.bind(PasswordController)
);

module.exports = router;
