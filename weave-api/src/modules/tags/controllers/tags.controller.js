const { fromUnknown } = require("@/errors");
const TagsRepository = require("@/modules/tags/repositories/tags.repository");
const TagsBaseController = require("@/modules/tags/controllers/base.controller");

class TagsController extends TagsBaseController {
  /**
   * Cria uma tag.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async createTag(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (userId == null) return;

      const { project_id, org_id } = req.params;
      const { name, color } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Tag name is required" });
      }

      const tag = await TagsRepository.createTag({
        projectId: project_id || null,
        orgId: org_id || null,
        name,
        color,
        createdBy: userId,
      });
      res.status(201).json(tag);
    } catch (error) {
      next(fromUnknown(error));
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
      const tags = await TagsRepository.getTags({
        projectId: project_id || null,
        orgId: org_id || null,
      });
      res.status(200).json(tags);
    } catch (error) {
      next(fromUnknown(error));
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

      const tag = await TagsRepository.updateTag(tag_id, {
        projectId: project_id || null,
        orgId: org_id || null,
        updates: { name, color },
      });
      if (!tag) {
        return res.status(404).json({ error: "Tag not found" });
      }

      res.status(200).json(tag);
    } catch (error) {
      next(fromUnknown(error));
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
      const userId = this._requireAuthenticatedUser(req, res);
      if (userId == null) return;

      const { project_id, org_id, tag_id } = req.params;

      const tag = await TagsRepository.deleteTag(tag_id, {
        projectId: project_id || null,
        orgId: org_id || null,
        deletedBy: userId,
      });
      if (!tag) {
        return res
          .status(404)
          .json({ error: "Tag not found or already deleted" });
      }

      res.status(200).json({ message: "Tag deleted successfully" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new TagsController();
