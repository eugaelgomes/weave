// src/modules/api-tokens/api-tokens.routes.js

const express = require("express");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { validate } = require("@/middlewares/validation/validate");
const {
  apiTokenParamsSchema,
  createApiTokenSchema,
} = require("./schemas/api-tokens.schema");

const ScopesController = require("@/modules/api-tokens/controllers/scopes.controller");
const CreateApiTokensController = require("@/modules/api-tokens/controllers/create-api-tokens.controller");
const ListApiTokensController = require("@/modules/api-tokens/controllers/list-api-tokens.controller");
const MutateApiTokensController = require("@/modules/api-tokens/controllers/mutate-api-tokens.controller");

const router = express.Router();

router.use(verifyToken);

router.get("/scopes", ScopesController.getScopesInfo.bind(ScopesController));
router.get(
  "/get-tokens",
  ListApiTokensController.listTokens.bind(ListApiTokensController)
);
router.post(
  "/create-token",
  validate(createApiTokenSchema, "body"),
  CreateApiTokensController.createToken.bind(CreateApiTokensController)
);
router.post(
  "/:id/revoke",
  validate(apiTokenParamsSchema, "params"),
  MutateApiTokensController.revokeToken.bind(MutateApiTokensController)
);
router.delete(
  "/:id",
  validate(apiTokenParamsSchema, "params"),
  MutateApiTokensController.deleteToken.bind(MutateApiTokensController)
);

module.exports = router;
