const NotesBaseController = require("./base.controller");
const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const PlansRepository = require("@/modules/plans/plans.repository");
const {
  collabMail,
} = require("@/services/email/templates/note-collab-notification");
const { sendPlanLimitExceeded } = require("@/utils/plan-limit-http");
const {
  respondIfWorkspaceShareDenied,
} = require("@/utils/workspace-share-guard");
const {
  notifyOrganizationDefaultChannel,
} = require("@/services/integrations/slack/slack-notify.service");

const APP_FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

/**
 * Colaboradores em notas.
 */
class NotesCollaboratorsController extends NotesBaseController {
  async addCollaborator(req, res, next) {
    try {
      const { noteId } = req.params;
      const { userId: collaboratorId } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar/Criar registro de uso
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Buscar detalhes do plano
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // Validar limite de colaboradores por nota
      const currentCollaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);
      const maxCollaborators =
        planDetails.details?.limits?.max_collaborators_per_note;

      if (maxCollaborators && currentCollaborators.length >= maxCollaborators) {
        return sendPlanLimitExceeded(res, {
          resource: "note_collaborators",
          limit_key: "limits.max_collaborators_per_note",
          error: "Limite de colaboradores atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${maxCollaborators} colaboradores por nota.`,
        });
      }

      // Verificar se a nota existe e pertence ao usuário
      await this._validateNoteOwnership(noteId, userId);

      // Validação de dados obrigatórios
      if (!collaboratorId) {
        throw new Error("ID do colaborador é obrigatório");
      }

      // Verificar se o usuário não está tentando adicionar a si mesmo
      if (collaboratorId === userId) {
        throw new Error("Você não pode adicionar a si mesmo como colaborador");
      }

      if (await respondIfWorkspaceShareDenied(res, userId, collaboratorId)) {
        return;
      }

      // Verificar se o colaborador já está ativo
      const isAlreadyCollaborator = await this.notesRepository.isCollaborator(
        noteId,
        collaboratorId
      );

      if (isAlreadyCollaborator) {
        throw new Error("Usuário já é colaborador desta nota");
      }

      // Adicionar ou reativar colaborador
      const result = await this.notesRepository.addCollaborator(
        noteId,
        collaboratorId
      );

      if (!result) {
        throw new Error("Usuário já é colaborador desta nota");
      }

      // Buscar dados do colaborador adicionado e da nota
      const collaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);
      const newCollaborator = collaborators.find(
        (c) => c.user_id === collaboratorId
      );

      // Buscar dados completos do colaborador para o email
      const collaboratorData =
        await SearchUsersRepository.findById(collaboratorId);
      const ownerData = await SearchUsersRepository.findById(userId);
      const noteData = await this.notesRepository.getNoteById(noteId);

      // Enviar email de notificação (não bloquear a resposta se falhar)
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
            "Erro ao enviar email de colaboração:",
            emailError.message
          );
          // Não falhamos a operação por causa do email
        }
      }

      // Adicionar notificação no sistema
      if (noteData) {
        await NotificationsRepository.createNotification({
          userId: collaboratorId,
          actorId: userId,
          type: "note_shared",
          entityType: "note",
          entityId: noteId,
          title: `Você foi adicionado à nota ${noteData.title}`,
          content: {
            action: "collaborator_added",
            note_id: noteId,
            shared_by: userId,
          },
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
        message: "Colaborador adicionado com sucesso",
        collaborator: newCollaborator,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * DELETE /api/notes/:noteId/collaborators/:collaboratorId - Remover colaborador
   * Remove um colaborador da nota
   */
  async removeCollaborator(req, res, next) {
    try {
      const { noteId, collaboratorId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e pertence ao usuário
      const note = await this._validateNoteOwnership(noteId, userId);

      // Verificar se o colaborador existe na nota
      const isCollaborator = await this.notesRepository.isCollaborator(
        noteId,
        collaboratorId
      );

      if (!isCollaborator) {
        throw new Error("Usuário não é colaborador desta nota");
      }

      // Remover colaborador
      const result = await this.notesRepository.removeCollaborator(
        noteId,
        collaboratorId
      );

      if (result.rowCount === 0) {
        throw new Error("Falha ao remover colaborador");
      }

      res.status(200).json({
        message: "Colaborador removido com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * PUT /api/notes/:noteId/recuseCollaboration - Recusar colaboração
   * Permite que um colaborador remova a si mesmo de uma nota compartilhada
   */
  async recuseCollaboration(req, res, next) {
    try {
      const { noteId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Impedir que o dono recuse a própria nota
      //await this._validateNotOwner(noteId, userId);

      const result = await this.notesRepository.recuseCollaboration(
        noteId,
        userId
      );

      if (result.rowCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Você já recusou ou não era colaborador desta nota",
        });
      }

      res.status(200).json({
        success: true,
        message: "Você não é mais colaborador desta nota",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/notes/:noteId/collaborators - Listar colaboradores
   * Lista todos os colaboradores de uma nota
   */
  async getCollaborators(req, res, next) {
    try {
      const { noteId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se a nota existe e o usuário tem acesso (proprietário ou colaborador pode ver)
      await this._validateNoteAccess(noteId, userId);

      // Buscar colaboradores pelo /:id da nota
      const collaborators =
        await this.notesRepository.getCollaboratorsByNoteId(noteId);

      if (collaborators.length === 0) {
        return res.status(200).json({
          collaborators: [],
          message: "Nenhum colaborador encontrado.",
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
