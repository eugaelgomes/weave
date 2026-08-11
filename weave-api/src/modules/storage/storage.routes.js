const express = require("express");
const router = express.Router();
const storageController = require("./controllers/storage.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");

// Protegemos o acesso ao File Manager para exigir autenticação (e idealmente checagem de Admin/Role depois)
router.use(verifyToken);

router.get("/files", storageController.listFiles);
router.post("/folder", storageController.createFolder);
router.put("/rename", storageController.renameFile);
router.delete("/files", storageController.deleteItem);

module.exports = router;
