const { fromUnknown } = require("@/errors");
const TaskPrioritiesRepository = require("@/modules/task-priorities/repositories/task-priorities.repository");
const TaskPrioritiesBaseController = require("@/modules/task-priorities/controllers/base.controller");

class TaskPrioritiesController extends TaskPrioritiesBaseController {
  /**
   * Cria uma prioridade de tarefa.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async createPriority(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const { project_id, org_id } = req.params;
      const { name, color, level } = req.body;

      if (!name || level === undefined) {
        return res.status(400).json({ error: "Nome e nível são obrigatórios" });
      }

      const priority = await TaskPrioritiesRepository.createPriority({
        projectId: project_id || null,
        orgId: org_id || null,
        name,
        color,
        level,
        createdBy: userId,
      });
      res.status(201).json(priority);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Busca lista de prioridades de tarefa de um projeto ou organização.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getPriorities(req, res, next) {
    try {
      const { project_id, org_id } = req.params;
      const priorities = await TaskPrioritiesRepository.getPriorities({
        projectId: project_id || null,
        orgId: org_id || null,
      });
      res.status(200).json(priorities);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Atualiza dados de uma prioridade já existente.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async updatePriority(req, res, next) {
    try {
      const { project_id, org_id, priority_id } = req.params;
      const { name, color, level } = req.body;

      const priority = await TaskPrioritiesRepository.updatePriority(
        priority_id,
        {
          projectId: project_id || null,
          orgId: org_id || null,
          updates: { name, color, level },
        }
      );
      if (!priority) {
        return res.status(404).json({ error: "Prioridade não encontrada" });
      }

      res.status(200).json(priority);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Remove uma prioridade de maneira lógica.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async deletePriority(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const { project_id, org_id, priority_id } = req.params;

      const priority = await TaskPrioritiesRepository.deletePriority(
        priority_id,
        {
          projectId: project_id || null,
          orgId: org_id || null,
          deletedBy: userId,
        }
      );
      if (!priority) {
        return res
          .status(404)
          .json({ error: "Prioridade não encontrada ou já deletada" });
      }

      res.status(200).json({ message: "Prioridade deletada com sucesso" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new TaskPrioritiesController();
