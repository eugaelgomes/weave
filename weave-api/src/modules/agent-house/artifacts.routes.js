const express = require("express");
const artifactsController = require("./controllers/artifacts.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");

const router = express.Router();

router.use(verifyToken);

router.post("/", artifactsController.createArtifact.bind(artifactsController));
router.get("/:id", artifactsController.getArtifact.bind(artifactsController));
router.patch(
  "/:id",
  artifactsController.updateArtifact.bind(artifactsController)
);

module.exports = router;
