const ProjectsCoreController = require("@/modules/projects/controllers/projects-core.controller");
const userViewPrefsRepository = require("@/modules/projects/repositories/user-view-prefs.repository");

class UserViewPrefsController extends ProjectsCoreController {
  /**
   * GET /api/projects/:id/my-view-preference
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async getMyView(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const { id: projectId } = req.params;
      const view = await userViewPrefsRepository.getUserView(projectId, userId);
      res.status(200).json({ view });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/projects/:id/my-view-preference
   * Body: { view: 'board' | 'list' }
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async setMyView(req, res, next) {
    try {
      const userId = this._requireAuthenticatedUser(req, res);
      if (!userId) return;

      const { id: projectId } = req.params;
      const { view } = req.body;
      const saved = await userViewPrefsRepository.upsertUserView(
        projectId,
        userId,
        view
      );
      res.status(200).json({ view: saved });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new UserViewPrefsController();
