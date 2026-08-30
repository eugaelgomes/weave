const express = require("express");
const artifactsController = require("./controllers/artifacts/artifacts.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");

const router = express.Router();

router.use(verifyToken);

router.post("/", (req, res, next) => artifactsController.createArtifact(req, res, next));
router.get("/:id", (req, res, next) => artifactsController.getArtifact(req, res, next));
router.patch("/:id", (req, res, next) => artifactsController.updateArtifact(req, res, next));

module.exports = router;
