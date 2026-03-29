const tagsRepository = require("./tags.repository");

class TagsController {
  async createTag(req, res, next) {
    try {
      const { org_id } = req.params;
      const { name, color } = req.body;
      const userId = req.user.userId;

      if (!name) {
        return res.status(400).json({ error: "Nome da tag é obrigatório" });
      }

      const tag = await tagsRepository.createTag(org_id, name, color, userId);
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  }

  async getTags(req, res, next) {
    try {
      const { org_id } = req.params;
      const tags = await tagsRepository.getTagsByOrgId(org_id);
      res.status(200).json(tags);
    } catch (error) {
      next(error);
    }
  }

  async updateTag(req, res, next) {
    try {
      const { org_id, tag_id } = req.params;
      const { name, color } = req.body;

      const tag = await tagsRepository.updateTag(tag_id, org_id, {
        name,
        color,
      });
      if (!tag) {
        return res.status(404).json({ error: "Tag não encontrada" });
      }

      res.status(200).json(tag);
    } catch (error) {
      next(error);
    }
  }

  async deleteTag(req, res, next) {
    try {
      const { org_id, tag_id } = req.params;
      const userId = req.user.userId;

      const tag = await tagsRepository.deleteTag(tag_id, org_id, userId);
      if (!tag) {
        return res
          .status(404)
          .json({ error: "Tag não encontrada ou já deletada" });
      }

      res.status(200).json({ message: "Tag deletada com sucesso" });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TagsController();
