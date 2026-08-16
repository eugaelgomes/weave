const { fromUnknown } = require("@/errors");
const TaskPrioritiesRepository = require("@/modules/projects/repositories/task-priorities.repository");
const TaskPrioritiesBaseController = require("@/modules/projects/controllers/base.controller");

class TaskPrioritiesController extends TaskPrioritiesBaseController {
  /**
   * Create a task priority.
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

      const priority = await TaskPrioritiesRepository.createPriority({
        color,
        createdBy: userId,
        level,
        name,
        orgId: org_id || null,
        projectId: project_id || null,
      });
      res.status(201).json(priority);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Fetch a list of task priorities for a project or organization.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getPriorities(req, res, next) {
    try {
      const { project_id, org_id } = req.params;
      const priorities = await TaskPrioritiesRepository.getPriorities({
        orgId: org_id || null,
        projectId: project_id || null,
      });
      res.status(200).json(priorities);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Update data of an existing task priority.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async updatePriority(req, res, next) {
    try {
      const { project_id, org_id, priority_id } = req.params;
      const { name, color, level } = req.body;

      const priority = await TaskPrioritiesRepository.updatePriority(priority_id, {
        orgId: org_id || null,
        projectId: project_id || null,
        updates: { color, level, name },
      });
      if (!priority) {
        return res.status(404).json({ error: "Prioridade não encontrada" });
      }

      res.status(200).json(priority);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Logically remove a task priority.
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

      const priority = await TaskPrioritiesRepository.deletePriority(priority_id, {
        deletedBy: userId,
        orgId: org_id || null,
        projectId: project_id || null,
      });
      if (!priority) {
        return res.status(404).json({ error: "Prioridade não encontrada ou já deletada" });
      }

      res.status(200).json({ message: "Prioridade deletada com sucesso" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }
}

module.exports = new TaskPrioritiesController();
