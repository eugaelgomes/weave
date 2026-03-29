const taskPrioritiesRepository = require("./task_priorities.repository");

class TaskPrioritiesController {
  async createPriority(req, res, next) {
    try {
      const { org_id } = req.params;
      const { name, color, level } = req.body;
      const userId = req.user.userId;

      if (!name || level === undefined) {
        return res.status(400).json({ error: "Nome e nível são obrigatórios" });
      }

      const priority = await taskPrioritiesRepository.createPriority(
        org_id,
        name,
        color,
        level,
        userId
      );
      res.status(201).json(priority);
    } catch (error) {
      next(error);
    }
  }

  async getPriorities(req, res, next) {
    try {
      const { org_id } = req.params;
      const priorities =
        await taskPrioritiesRepository.getPrioritiesByOrgId(org_id);
      res.status(200).json(priorities);
    } catch (error) {
      next(error);
    }
  }

  async updatePriority(req, res, next) {
    try {
      const { org_id, priority_id } = req.params;
      const { name, color, level } = req.body;

      const priority = await taskPrioritiesRepository.updatePriority(
        priority_id,
        org_id,
        { name, color, level }
      );
      if (!priority) {
        return res.status(404).json({ error: "Prioridade não encontrada" });
      }

      res.status(200).json(priority);
    } catch (error) {
      next(error);
    }
  }

  async deletePriority(req, res, next) {
    try {
      const { org_id, priority_id } = req.params;
      const userId = req.user.userId;

      const priority = await taskPrioritiesRepository.deletePriority(
        priority_id,
        org_id,
        userId
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
