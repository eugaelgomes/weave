const BaseController = require("@/modules/workspaces/controllers/base-controller");
const { prisma } = require("@theweave/database");
const fs = require("fs/promises");
const spacesService = require("@/services/storage.service");
const { SpacesService } = require("@/services/storage.service");
const OnboardingService = require("../services/onboarding.service");
const SearchUsersRepository = require("@/modules/users/repositories/users.repository");
const { normalizeWorkspaceName } = require("@/modules/workspaces/utils/normalizer");

class OnboardingController extends BaseController {
  /**
   * POST /api/v1/users/me/onboarding/step-1
   * Configures personal profile details
   */
  async submitStepOneProfile(req, res, next) {
    try {
      const { userId } = req.user;

      const user = await SearchUsersRepository.findById(userId);
      if (!user.email_verified) {
        return res.status(403).json({
          code: "EMAIL_NOT_VERIFIED",
          error: "Email verification is required before proceeding.",
        });
      }

      const result = await OnboardingService.processProfileStep(userId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/me/onboarding/step-2
   * Configures workspace
   */
  async submitStepTwoWorkspace(req, res, next) {
    try {
      const { userId } = req.user;

      const user = await SearchUsersRepository.findById(userId);
      if (!user.email_verified) {
        return res.status(403).json({
          code: "EMAIL_NOT_VERIFIED",
          error: "Email verification is required before proceeding.",
        });
      }

      const result = await OnboardingService.processWorkspaceStep(userId, req.body);
      res.json({ data: result, success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/me/onboarding/workspace-logo
   * Uploads the logo for the workspace created in step two, before onboarding is complete.
   */
  async uploadWorkspaceLogo(req, res, next) {
    try {
      const { userId } = req.user;
      if (!req.file) throw new Error("No logo image was uploaded.");

      const user = await prisma.users.findUnique({
        select: { workspace_id: true },
        where: { user_id: userId },
      });
      const workspace = user?.workspace_id
        ? await prisma.workspaces.findFirst({
            where: { deleted: false, id: user.workspace_id, user_id: userId },
          })
        : null;

      if (!workspace) {
        return res.status(404).json({ message: "Workspace not found for logo upload." });
      }

      const fileBuffer = req.file.buffer || (await fs.readFile(req.file.path));
      const folderPath = spacesService.buildKey(
        SpacesService.FOLDER_PATHS.ORGANIZATIONS.ROOT,
        workspace.id,
        SpacesService.FOLDER_PATHS.ORGANIZATIONS.LOGO
      );
      const result = await spacesService.uploadImage(
        fileBuffer,
        req.file.mimetype,
        userId,
        null,
        folderPath
      );
      if (!result.success) throw new Error("Unable to upload workspace logo.");

      const updatedWorkspace = await this.workspacesRepository.updateWorkspaceLogo(
        workspace.id,
        result.key,
        userId
      );
      if (!updatedWorkspace) throw new Error("Unable to save workspace logo.");

      return res.status(200).json({
        data: { logo_url: result.key },
        success: true,
      });
    } catch (error) {
      next(error);
    } finally {
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => undefined);
      }
    }
  }

  /**
   * GET /api/v1/users/me/onboarding/workspace-name-availability
   * Checks the normalized workspace identifier before the final submission.
   */
  async checkWorkspaceUniqueNameAvailability(req, res, next) {
    try {
      const uniqueName = normalizeWorkspaceName(req.query.unique_name);

      if (!uniqueName) {
        return res.json({
          data: { available: false, unique_name: null },
          success: true,
        });
      }

      const existingNames = await this.workspacesRepository.getAvailableWorkspaceNames(uniqueName);
      return res.json({
        data: {
          available: !existingNames.includes(uniqueName),
          unique_name: uniqueName,
        },
        success: true,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/v1/users/me/onboarding/step-3
   * Optionally creates teams and sends workspace invitations before completion.
   */
  async submitStepThreeTeams(req, res, next) {
    try {
      const { userId } = req.user;
      const result = await OnboardingService.processTeamsStep(userId, req.body);
      res.json({ data: result, success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/me/onboarding/step-3-complete
   * Finalizes onboarding
   */
  async completeOnboarding(req, res, next) {
    try {
      const { userId } = req.user;

      const result = await OnboardingService.completeOnboarding(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OnboardingController();
