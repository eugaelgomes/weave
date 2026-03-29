const tagsRepository = require("./tags.repository");

class TagsController {
  /**
   * Cria uma tag.
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   * @param {import('express').NextFunction} next 
   */
  async createTag(req, res, next) {
    try {
      const { project_id, org_id } = req.params;
      const { name, color } = req.body;
      const userId = req.user.userId;

      if (!name) {
        return res.status(400).json({ error: "Nome da tag é obrigatório" });
      }

      const tag = await tagsRepository.createTag({
        projectId: project_id || null,
        orgId: org_id || null,
        name,
        color,
        createdBy: userId,
      });
      res.status(201).json(tag);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Busca tags filtrando por projeto ou organização.
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   * @param {import('express').NextFunction} next 
   */
  async getTags(req, res, next) {
    try {
      const { project_id, org_id } = req.params;
      const tags = await tagsRepository.getTags({
        projectId: project_id || null,
        orgId: org_id || null,
      });
      res.status(200).json(tags);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Atualiza dados de uma tag existente.
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   * @param {import('express').NextFunction} next 
   */
  async updateTag(req, res, next) {
    try {
      const { project_id, org_id, tag_id } = req.params;
      const { name, color } = req.body;

      const tag = await tagsRepository.updateTag(tag_id, {
        projectId: project_id || null,
        orgId: org_id || null,
        updates: { name, color },
      });
      if (!tag) {
        return res.status(404).json({ error: "Tag não encontrada" });
      }

      res.status(200).json(tag);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Deleta uma tag logicamente do banco de dados (soft delete).
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   * @param {import('express').NextFunction} next 
   */
  async deleteTag(req, res, next) {
    try {
      const { project_id, org_id, tag_id } = req.params;
      const userId = req.user.userId;

      const tag = await tagsRepository.deleteTag(tag_id, {
        projectId: project_id || null,
        orgId: org_id || null,
        deletedBy: userId,
      });
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
