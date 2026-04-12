const express = require("express");
const { verifyToken } = require("@/middlewares/verify-token");

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
  CreateApiTokensController.createToken.bind(CreateApiTokensController)
);
router.post(
  "/:id/revoke",
  MutateApiTokensController.revokeToken.bind(MutateApiTokensController)
);
router.delete(
  "/:id",
  MutateApiTokensController.deleteToken.bind(MutateApiTokensController)
);

module.exports = router;
