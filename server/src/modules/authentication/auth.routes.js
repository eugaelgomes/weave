const express = require("express");
const { authLimiter } = require("@/middlewares/security/request-limiters");
const { validate } = require("@/middlewares/validation/validate");
const { verifyToken } = require("@/middlewares/auth/verify-token");

// Controllers
const ProvidersController = require("./controllers/providers.controller");
const CredentialsController = require("./controllers/credentials.controller");
const GoogleController = require("./controllers/oauth/google.controller");
const GithubController = require("./controllers/oauth/github.controller");
const MicrosoftController = require("./controllers/oauth/microsoft.controller");
const SamlController = require("./controllers/saml/saml.controller");
const LogoutController = require("./controllers/logout.controller");
const SessionsController = require("./controllers/sessions.controller");
const PasswordController = require("./controllers/password.controller");

// Schemas
const {
  signinCodeRequestSchema,
  signinCodeVerifySchema,
  signinSchema,
} = require("./schemas/credentials.schema");
const { oauthCallbackSchema } = require("./schemas/oauth.schema");
const { ssoDiscoverSchema, samlAcsCallbackSchema } = require("./schemas/saml.schema");
const { forgotPasswordSchema, resetPasswordSchema } = require("./schemas/password.schema");

const router = express.Router();

// ── Available Providers ──
router.get("/providers", ProvidersController.listProviders.bind(ProvidersController));

// ── Credentials ──
router.post(
  "/signin",
  authLimiter,
  validate(signinSchema, "body"),
  CredentialsController.userSignin.bind(CredentialsController)
);

router.post(
  "/signin/code/request",
  authLimiter,
  validate(signinCodeRequestSchema, "body"),
  CredentialsController.requestSigninCode.bind(CredentialsController)
);

router.post(
  "/signin/code/verify",
  authLimiter,
  validate(signinCodeVerifySchema, "body"),
  CredentialsController.userSigninWithCode.bind(CredentialsController)
);

// ── Social OAuth ──
router.get("/signin/sso/google", GoogleController.googleAuth.bind(GoogleController));
router.get("/oauth/google", GoogleController.googleAuth.bind(GoogleController));

router.get(
  "/signin/sso/google/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  GoogleController.googleCallback.bind(GoogleController)
);
router.get(
  "/oauth/google/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  GoogleController.googleCallback.bind(GoogleController)
);

router.get("/signin/sso/github", GithubController.githubAuth.bind(GithubController));
router.get("/oauth/github", GithubController.githubAuth.bind(GithubController));

router.get(
  "/signin/sso/github/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  GithubController.githubCallback.bind(GithubController)
);
router.get(
  "/oauth/github/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  GithubController.githubCallback.bind(GithubController)
);

router.get("/signin/sso/microsoft", MicrosoftController.microsoftAuth.bind(MicrosoftController));
router.get("/oauth/microsoft", MicrosoftController.microsoftAuth.bind(MicrosoftController));

router.get(
  "/signin/sso/microsoft/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  MicrosoftController.microsoftCallback.bind(MicrosoftController)
);
router.get(
  "/oauth/microsoft/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  MicrosoftController.microsoftCallback.bind(MicrosoftController)
);

// ── Enterprise SSO (SAML) ──
router.post(
  "/sso/discover",
  authLimiter,
  validate(ssoDiscoverSchema, "body"),
  SamlController.discoverSso.bind(SamlController)
);

router.get("/sso/saml/:workspaceId/login", SamlController.samlLogin.bind(SamlController));

router.post(
  "/sso/saml/acs",
  validate(samlAcsCallbackSchema, "body"),
  SamlController.samlCallback.bind(SamlController)
);

// ── Session ──
router.post("/logout", LogoutController.logout.bind(LogoutController));
router.get("/sessions", verifyToken, SessionsController.list.bind(SessionsController));
router.delete(
  "/sessions/others",
  verifyToken,
  SessionsController.revokeOthers.bind(SessionsController)
);
router.delete(
  "/sessions/:sessionId",
  verifyToken,
  SessionsController.revoke.bind(SessionsController)
);

// ── Password Recovery ──
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
