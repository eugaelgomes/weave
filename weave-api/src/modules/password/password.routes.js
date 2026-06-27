const express = require("express");
const { validate } = require("@/middlewares/validation/validate");

const PasswordController = require("@/modules/password/controllers/password.controller");
const {
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("./schemas/password.schema");

const router = express.Router();

router.post(
  "/forgot-password",
  validate(forgotPasswordSchema, "body"),
  PasswordController.forgotPassword.bind(PasswordController)
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema, "body"),
  PasswordController.resetPassword.bind(PasswordController)
);

module.exports = router;
