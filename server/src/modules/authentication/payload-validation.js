const { body, query, validationResult } = require("express-validator");

function rejectUnexpectedKeys(target, allowedKeys) {
  const keys = Object.keys(target || {});
  return keys.filter((key) => !allowedKeys.includes(key));
}

function validateSigninPayload() {
  return [
    body("login")
      .exists({ values: "falsy" })
      .withMessage("Usuário ou e-mail é obrigatório.")
      .bail()
      .isString()
      .withMessage("Usuário ou e-mail deve ser texto.")
      .bail()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage("Usuário ou e-mail inválido."),
    body("password")
      .exists({ values: "falsy" })
      .withMessage("Senha é obrigatória.")
      .bail()
      .isString()
      .withMessage("Senha inválida.")
      .bail()
      .isLength({ min: 1, max: 255 })
      .withMessage("Senha inválida."),
  ];
}

function validateOauthCallbackPayload() {
  return [
    query("code")
      .optional()
      .isString()
      .withMessage("Código inválido.")
      .bail()
      .trim()
      .isLength({ min: 8, max: 2048 })
      .withMessage("Código inválido.")
      .matches(/^[A-Za-z0-9._\-~/+=:]+$/)
      .withMessage("Código inválido."),
    query("error")
      .optional()
      .isString()
      .withMessage("Erro OAuth inválido.")
      .bail()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Erro OAuth inválido."),
    query("state")
      .exists({ values: "falsy" })
      .withMessage("State OAuth é obrigatório.")
      .bail()
      .isString()
      .withMessage("State OAuth inválido.")
      .bail()
      .trim()
      .isLength({ min: 8, max: 255 })
      .withMessage("State OAuth inválido.")
      .matches(/^[A-Za-z0-9._\-]+$/)
      .withMessage("State OAuth inválido."),
  ];
}

function enforceSigninBodyShape(req, res, next) {
  const unexpected = rejectUnexpectedKeys(req.body, ["login", "password"]);
  if (unexpected.length > 0) {
    return res.status(400).json({
      message: "Payload inválido para signin.",
    });
  }
  return next();
}

function enforceOauthCallbackQueryShape(req, res, next) {
  const unexpected = rejectUnexpectedKeys(req.query, ["code", "error", "state"]);
  if (unexpected.length > 0) {
    return res.status(400).json({
      message: "Payload inválido para callback OAuth.",
    });
  }
  return next();
}

function handleAuthPayloadValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Auth data validation failed, please check it and try again.",
      errors: errors.array(),
    });
  }
  return next();
}

module.exports = {
  enforceOauthCallbackQueryShape,
  enforceSigninBodyShape,
  handleAuthPayloadValidation,
  validateOauthCallbackPayload,
  validateSigninPayload,
};
