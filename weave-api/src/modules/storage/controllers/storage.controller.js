const fileManagerService = require("../services/file-manager.service");

class StorageController {
  async listFiles(req, res) {
    try {
      const { prefix } = req.query;
      const items = await fileManagerService.listFiles(prefix);
      return res.status(200).json({ items });
    } catch (error) {
      console.error("[StorageController] Erro ao listar arquivos:", error);
      if (error.message.includes("configurado")) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: "Erro interno ao listar arquivos." });
    }
  }

  async createFolder(req, res) {
    try {
      const { path } = req.body;
      if (!path) {
        return res.status(400).json({ error: "O caminho (path) é obrigatório." });
      }

      const result = await fileManagerService.createFolder(path);
      return res.status(201).json(result);
    } catch (error) {
      console.error("[StorageController] Erro ao criar pasta:", error);
      if (error.message.includes("permissão") || error.message.includes("configurado")) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: "Erro interno ao criar pasta." });
    }
  }

  async deleteItem(req, res) {
    try {
      const { key } = req.body;
      if (!key) {
        return res.status(400).json({ error: "A chave (key) é obrigatória." });
      }

      const result = await fileManagerService.deleteItem(key);
      return res.status(200).json(result);
    } catch (error) {
      console.error("[StorageController] Erro ao deletar item:", error);
      if (error.message.includes("sistema") || error.message.includes("configurado")) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: "Erro interno ao deletar item." });
    }
  }

  async renameFile(req, res) {
    try {
      const { oldKey, newKey } = req.body;
      if (!oldKey || !newKey) {
        return res.status(400).json({ error: "As chaves oldKey e newKey são obrigatórias." });
      }

      const result = await fileManagerService.renameFile(oldKey, newKey);
      return res.status(200).json(result);
    } catch (error) {
      console.error("[StorageController] Erro ao renomear arquivo:", error);
      if (error.message.includes("sistema") || error.message.includes("conflita") || error.message.includes("configurado")) {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: "Erro interno ao renomear arquivo." });
    }
  }
}

module.exports = new StorageController();
