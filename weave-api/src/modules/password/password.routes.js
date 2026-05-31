const express = require("express");
const { body } = require("express-validator");

const PasswordController = require("@/modules/password/password.controller");
const { hasPlusAliasInLocalPart } = require("@/utils/data/email-rules");

const router = express.Router();

router.post(
  "/forgot-password",
  [
    body("email")
      .trim()
      .isEmail()
      .bail()
      .custom((value) => !hasPlusAliasInLocalPart(value))
      .withMessage("E-mails com alias (+) no endereço não são permitidos."),
  ],
  PasswordController.forgotPassword.bind(PasswordController)
);

router.post(
  "/reset-password",
  PasswordController.resetPassword.bind(PasswordController)
);

module.exports = router;
