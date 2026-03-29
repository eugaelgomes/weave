const express = require("express");
const ApiTokensController = require("./api-tokens.controller");
const { verifyToken } = require("@/middlewares/verify-token");

const router = express.Router();

// All internal API tokens endpoints require standard user authentication
router.use(verifyToken);

router.get("/scopes", ApiTokensController.getScopesInfo);
router.get("/get-tokens", ApiTokensController.listTokens);
router.post("/create-token", ApiTokensController.createToken);
router.post("/:id/revoke", ApiTokensController.revokeToken);
router.delete("/:id", ApiTokensController.deleteToken);

module.exports = router;
