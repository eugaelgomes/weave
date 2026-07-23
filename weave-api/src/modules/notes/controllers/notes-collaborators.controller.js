const NotesBaseController = require("./base.controller");
const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const PlanUsageManager = require("@/modules/plans/controllers/plans.controller");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const {
  collabMail,
} = require("@/services/email/templates/note-collab-notification");
const { sendPlanLimitExceeded } = require("@/modules/plans/utils/plan-limit-http.util");
const {
  assertNoteWorkspaceShareAllowed,
} = require("@/modules/organizations/utils/workspace-share-guard.util");
const {
  notifyCollaboratorAdded,
} = require("@/modules/slack/utils/slack-notify.util");

const APP_FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Collaborators in notes.
 */
class NotesCollaboratorsController extends NotesBaseController {
  async addCollaborator(req, res, next) {
    try {
      const { noteId } = req.params;
      const { userId: collaboratorId } = req.body;

      // Authentication validation
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Fetch/Create usage record
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Fetch plan details
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Plan configuration not found for this user.",
        });
      }

      // Validate collaborators limit per note
      const currentCollaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);
      const maxCollaborators =
        planDetails.details?.limits?.max_collaborators_per_note;

      if (maxCollaborators && currentCollaborators.length >= maxCollaborators) {
        return sendPlanLimitExceeded(res, {
          error: "Collaborators limit reached",
          limit_key: "limits.max_collaborators_per_note",
          message: `Your plan (${planDetails.name}) allows only ${maxCollaborators} collaborators per note.`,
          resource: "note_collaborators",
        });
      }

      // Verify if the note exists and belongs to the user
      await this._validateNoteOwnership(noteId, userId);

      // Mandatory data validation
      if (!collaboratorId) {
        throw new Error("Collaborator ID is required");
      }

      // Verify if the user is not trying to add themselves
      if (collaboratorId === userId) {
        throw new Error("You cannot add yourself as a collaborator");
      }

      if (await respondIfWorkspaceShareDenied(res, userId, collaboratorId)) {
        return;
      }

      // Verify if the collaborator is already active
      const isAlreadyCollaborator = await this.notesRepository.isCollaborator(
        noteId,
        collaboratorId
      );

      if (isAlreadyCollaborator) {
        throw new Error("User is already a collaborator in this note");
      }

      // Add or reactivate collaborator
      const result = await this.notesRepository.addCollaborator(
        noteId,
        collaboratorId
      );

      if (!result) {
        throw new Error("User is already a collaborator in this note");
      }

      // Fetch data of the added collaborator and the note
      const collaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);
      const newCollaborator = collaborators.find(
        (c) => c.user_id === collaboratorId
      );

      // Fetch complete collaborator data for the email
      const collaboratorData =
        await SearchUsersRepository.findById(collaboratorId);
      const ownerData = await SearchUsersRepository.findById(userId);
      const noteData = await this.notesRepository.getNoteById(noteId);

      // Send notification email (do not block the response if it fails)
      if (collaboratorData && ownerData && noteData) {
        try {
          collabMail(
            collaboratorData.email,
            collaboratorData.name,
            noteData.title,
            ownerData.name,
            noteData.public_note_id || null
          );
        } catch (emailError) {
          console.error(
            "Error sending collaboration email:",
            emailError.message
          );
          // We don't fail the operation because of the email
        }
      }

      // Add notification to the system
      if (noteData) {
        await NotificationsRepository.createNotification({
          actorId: userId,
          content: {
            action: "collaborator_added",
            note_id: noteId,
            shared_by: userId,
          },
          entityId: noteId,
          entityType: "note",
          title: `You have been added to the note ${noteData.title}`,
          type: "note_shared",
          userId: collaboratorId,
        });
      }

      if (noteData?.scope_organization_id) {
        const noteUrl = `${APP_FRONTEND_URL.replace(/\/+$/, "")}/app/notes/${noteId}`;
        void notifyOrganizationDefaultChannel({
          organizationId: noteData.scope_organization_id,
          text: `*[Weave]* ${ownerData?.name || "A user"} added a collaborator to the note *${noteData.title}*.\n${noteUrl}`,
        });
      }

      res.status(201).json({
        collaborator: newCollaborator,
        message: "Collaborator added successfully",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/notes/:noteId/collaborators/:collaboratorId - Remove collaborator
   * Removes a collaborator from the note
   */
  async removeCollaborator(req, res, next) {
    try {
      const { noteId, collaboratorId } = req.params;

      // Authentication validation
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verify if the note exists and belongs to the user
      await this._validateNoteOwnership(noteId, userId);

      // Verify if the collaborator exists in the note
      const isCollaborator = await this.notesRepository.isCollaborator(
        noteId,
        collaboratorId
      );

      if (!isCollaborator) {
        throw new Error("User is not a collaborator in this note");
      }

      // Remove collaborator
      const result = await this.notesRepository.removeCollaborator(
        noteId,
        collaboratorId,
        userId
      );

      if (result.rowCount === 0) {
        throw new Error("Failed to remove collaborator");
      }

      res.status(200).json({
        message: "Collaborator removed successfully",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/notes/:noteId/recuseCollaboration - Refuse collaboration
   * Allows a collaborator to remove themselves from a shared note
   */
  async recuseCollaboration(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Prevent the owner from refusing their own note
      //await this._validateNotOwner(noteId, userId);

      const result = await this.notesRepository.recuseCollaboration(
        noteId,
        userId
      );

      if (result.rowCount === 0) {
        return res.status(400).json({
          message:
            "You have already refused or were not a collaborator in this note",
          success: false,
        });
      }

      res.status(200).json({
        message: "You are no longer a collaborator in this note",
        success: true,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/notes/:noteId/collaborators - List collaborators
   * Lists all collaborators of a note
   */
  async getCollaborators(req, res, next) {
    try {
      const { noteId } = req.params;

      // Authentication validation
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verify if the note exists and the user has access (owner or collaborator can view)
      await this._validateNoteAccess(noteId, userId);

      // Fetch collaborators by note /:id
      const collaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);

      if (collaborators.length === 0) {
        return res.status(200).json({
          collaborators: [],
          message: "No collaborators found.",
        });
      } else {
        res.status(200).json({
          collaborators,
        });
      }
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesCollaboratorsController();
