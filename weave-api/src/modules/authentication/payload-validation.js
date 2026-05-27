const { body, query, validationResult } = require("express-validator");

function rejectUnexpectedKeys(target, allowedKeys) {
  const keys = Object.keys(target || {});
  return keys.filter((key) => !allowedKeys.includes(key));
}

function validateSigninPayload() {
  return [
    body("login")
      .exists({ values: "falsy" })
      .withMessage("Username or email is required.")
      .bail()
      .isString()
      .withMessage("Invalid username or email format.")
      .bail()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage("Invalid username or email length."),
    body("password")
      .exists({ values: "falsy" })
      .withMessage("Password is required.")
      .bail()
      .isString()
      .withMessage("Invalid password format.")
      .bail()
      .isLength({ min: 1, max: 255 })
      .withMessage("Invalid password length."),
  ];
}

function validateOauthCallbackPayload() {
  return [
    query("code")
      .optional()
      .isString()
      .withMessage("Invalid authorization code format.")
      .bail()
      .trim()
      .isLength({ min: 8, max: 2048 })
      .withMessage("Invalid authorization code length.")
      .matches(/^[A-Za-z0-9._\-~/+=:]+$/)
      .withMessage("Invalid authorization code characters."),
    query("error")
      .optional()
      .isString()
      .withMessage("Invalid OAuth error format.")
      .bail()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Invalid OAuth error length."),
    query("state")
      .exists({ values: "falsy" })
      .withMessage("OAuth state is required.")
      .bail()
      .isString()
      .withMessage("Invalid OAuth state format.")
      .bail()
      .trim()
      .isLength({ min: 8, max: 255 })
      .withMessage("Invalid OAuth state length.")
      .matches(/^[A-Za-z0-9._\-]+$/)
      .withMessage("Invalid OAuth state characters."),
  ];
}

function enforceSigninBodyShape(req, res, next) {
  const unexpected = rejectUnexpectedKeys(req.body, ["login", "password"]);
  if (unexpected.length > 0) {
    return res.status(400).json({
      message: "Invalid signin payload structure.",
    });
  }
  return next();
}

function enforceOauthCallbackQueryShape(req, res, next) {
  const unexpected = rejectUnexpectedKeys(req.query, ["code", "error", "state"]);
  if (unexpected.length > 0) {
    return res.status(400).json({
      message: "Invalid OAuth callback payload structure.",
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
