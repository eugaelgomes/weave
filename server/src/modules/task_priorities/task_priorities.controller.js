const taskPrioritiesRepository = require("./task_priorities.repository");

class TaskPrioritiesController {
  /**
   * Cria uma prioridade de tarefa.
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   * @param {import('express').NextFunction} next 
   */
  async createPriority(req, res, next) {
    try {
      const { project_id, org_id } = req.params;
      const { name, color, level } = req.body;
      const userId = req.user.userId;

      if (!name || level === undefined) {
        return res.status(400).json({ error: "Nome e nível são obrigatórios" });
      }

      const priority = await taskPrioritiesRepository.createPriority({
        projectId: project_id || null,
        orgId: org_id || null,
        name,
        color,
        level,
        createdBy: userId,
      });
      res.status(201).json(priority);
    } catch (error) {
      next(error);
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
      const priorities = await taskPrioritiesRepository.getPriorities({
        projectId: project_id || null,
        orgId: org_id || null,
      });
      res.status(200).json(priorities);
    } catch (error) {
      next(error);
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

      const priority = await taskPrioritiesRepository.updatePriority(
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
      next(error);
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
      const { project_id, org_id, priority_id } = req.params;
      const userId = req.user.userId;

      const priority = await taskPrioritiesRepository.deletePriority(
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
      next(error);
    }
  }
}

module.exports = new TaskPrioritiesController();
