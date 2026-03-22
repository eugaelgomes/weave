const OrganizationsBaseController = require("./base-controller");
const UserRepository = require("@/modules/users/users.repository");
const spacesService = require("@/services/storage");
const bcrypt = require("bcrypt");
const {
  send_organization_invite,
} = require("@/services/email/templates/invite-member/mail");
const { welcome_message } = require("@/services/email/templates/welcome-mail");
const { validRoles } = require("../normalizer");

class OrganizationMembersController extends OrganizationsBaseController {
  constructor() {
    super();
  }

  async addMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { memberId, role = "member" } = req.body;

      if (!memberId) {
        return res
          .status(400)
          .json({ success: false, error: "memberId é obrigatório" });
      }

      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Role deve ser 'super_admin', 'admin', 'member' ou 'guest'",
        });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const isMember = await this.organizationsRepository.isMember(
        currentOrg.id,
        memberId
      );
      if (isMember) {
        return res.status(400).json({
          success: false,
          error: "Usuário já é membro da organização",
        });
      }

      const newMember =
        await this.organizationsRepository.addOrganizationMember(
          currentOrg.id,
          memberId,
          role,
          "active",
          userId
        );

      res.status(200).json({
        status: "OK",
        message: "Membro adicionado com sucesso",
        data: newMember,
      });
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao adicionar membro",
      });
    }
  }

  async removeMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { memberId } = req.params;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      if (currentOrg.user_id === parseInt(memberId, 10)) {
        return res.status(400).json({
          success: false,
          error: "Não é possível remover o proprietário da organização",
        });
      }

      const removed =
        await this.organizationsRepository.removeOrganizationMember(
          currentOrg.id,
          memberId
        );
      if (!removed) {
        return res
          .status(404)
          .json({ success: false, error: "Membro não encontrado" });
      }

      res.status(200).json({
        status: "OK",
        message: "Membro removido com sucesso",
        data: removed,
      });
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao remover membro",
      });
    }
  }

  async getMembers(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const members = await this.organizationsRepository.getOrganizationMembers(
        currentOrg.id
      );

      res.status(200).json({
        status: "OK",
        organization_id: currentOrg.id,
        count: members.length,
        count_by_role: members.reduce((acc, member) => {
          acc[member.role] = (acc[member.role] || 0) + 1;
          return acc;
        }, {}),
        count_by_status: members.reduce((acc, member) => {
          acc[member.status] = (acc[member.status] || 0) + 1;
          return acc;
        }, {}),
        count_by_suspended: members.reduce((acc, member) => {
          const key = member.suspended || false ? "suspended" : "active";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
        list_org_members: members.map((member) => ({
          member_data: {
            id: member.user_id,
            name: member.name,
            username: member.username,
            email: member.email,
            avatar_url: member.avatar_url || null,
            membership: {
              role: member.role,
              status: member.status,
              suspended: member.suspended,
              created_at: member.created_at,
              updated_at: member.updated_at,
            },
            activity: {
              notes_count: parseInt(member.notes_count, 10) || 0,
              projects: member.projects || [],
              last_login_at: member.last_login_at || null,
            },
            invited_by: member.invited_by
              ? {
                  id: member.invited_by,
                  name: member.inviter_name,
                  username: member.inviter_username,
                  avatar_url: member.inviter_avatar_url || null,
                }
              : null,
          },
        })),
      });
    } catch (error) {
      console.error("Erro ao buscar membros:", error);
      res
        .status(500)
        .json({ status: "ERROR", error: "Erro ao buscar membros" });
    }
  }

  async inviteMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { email, role = "member", name, username } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      if (!validRoles.includes(role)) {
        return res.status(400).json({
          error:
            "Cargo inválido. Roles válidas: super_admin, admin, member, guest",
        });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res.status(404).json({ error: "Organização não encontrada" });
      }

      const existingUser = await UserRepository.findByUsernameOrEmail(
        "",
        email
      );
      if (existingUser.length > 0) {
        const isMember = await this.organizationsRepository.isMember(
          currentOrg.id,
          existingUser[0].user_id
        );
        if (isMember) {
          return res
            .status(400)
            .json({ error: "Este usuário já é membro da organização" });
        }
      }

      const existingInvite =
        await this.organizationsRepository.checkExistingInvite(
          currentOrg.id,
          email
        );
      if (existingInvite) {
        return res
          .status(400)
          .json({ error: "Já existe um convite pendente para este email" });
      }

      const invite = await this.organizationsRepository.createOrgInvite(
        currentOrg.id,
        email,
        role,
        userId,
        name,
        username
      );

      const inviter = await UserRepository.findById(userId);

      const emailResult = await send_organization_invite(
        email,
        currentOrg.org_name,
        inviter.name || inviter.username,
        invite.invite_id,
        role
      );

      if (!emailResult.success) {
        console.warn("Failed to send invite email:", emailResult.error);
      }

      res.status(201).json({
        status: "OK",
        message: "Convite enviado com sucesso",
        data: {
          invite_id: invite.invite_id,
          email: invite.email,
          role: invite.role,
          expires_at: invite.expires_at,
        },
      });
    } catch (error) {
      console.error("Erro ao convidar membro:", error);
      res.status(500).json({ error: "Erro ao enviar convite" });
    }
  }

  async acceptInvite(req, res) {
    try {
      const { token, name, username, password } = req.body;
      const userId = req.user?.userId;

      if (!token) {
        return res.status(400).json({ error: "Token é obrigatório" });
      }

      const invite =
        await this.organizationsRepository.findOrgInviteByToken(token);
      if (!invite) {
        return res.status(400).json({ error: "Convite inválido ou expirado" });
      }

      if (userId) {
        const isMember = await this.organizationsRepository.isMember(
          invite.org_id,
          userId
        );
        if (isMember) {
          return res
            .status(400)
            .json({ error: "Você já é membro desta organização" });
        }

        await this.organizationsRepository.addOrganizationMember(
          invite.org_id,
          userId,
          invite.role,
          "active",
          invite.invited_by
        );

        await this.organizationsRepository.verifyOrgInvite(invite.invite_id);

        return res.status(200).json({
          status: "OK",
          message: "Convite aceito com sucesso",
          data: {
            organization: {
              id: invite.org_id,
              name: invite.org_name,
              unique_name: invite.org_unique_name,
            },
            role: invite.role,
          },
        });
      }

      if (!name || !username || !password) {
        return res.status(400).json({
          error:
            "Nome, usuário e senha são obrigatórios para aceitar o convite",
        });
      }

      if (!invite.email) {
        return res.status(400).json({ error: "Convite sem email associado" });
      }

      const existingUsers = await UserRepository.findByUsernameOrEmail(
        username,
        invite.email
      );

      if (existingUsers.some((user) => user.email === invite.email)) {
        return res.status(400).json({
          error: "Email já cadastrado. Faça login para aceitar o convite.",
        });
      }

      if (existingUsers.some((user) => user.username === username)) {
        return res
          .status(400)
          .json({ error: "Nome de usuário já está em uso" });
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");

      const newUser = await UserRepository.createUser(
        name,
        username,
        invite.email,
        hashedPassword,
        null,
        createdAt
      );

      const newUserId = newUser[0].user_id;
      let profileImageUrl = null;

      if (req.file && req.file.buffer) {
        try {
          const saveResult = await spacesService.uploadProfileImage(
            req.file.buffer,
            req.file.mimetype,
            newUserId
          );

          if (saveResult.success) {
            profileImageUrl = saveResult.key;

            const updateResult = await UserRepository.updateProfileImage(
              newUserId,
              profileImageUrl
            );

            if (!(updateResult && updateResult.length > 0)) {
              console.error(
                `Falha ao atualizar avatar URL para usuário ${newUserId}`
              );
            }
          } else {
            console.error("Failed to upload to Digital Ocean Spaces");
          }
        } catch (imageError) {
          console.error("Erro ao fazer upload da imagem:", imageError);
        }
      }

      await UserRepository.verifyUserEmail(newUserId);

      await this.organizationsRepository.addOrganizationMember(
        invite.org_id,
        newUserId,
        invite.role,
        "active",
        invite.invited_by
      );

      await this.organizationsRepository.verifyOrgInvite(invite.invite_id);

      const mailResult = await welcome_message(name, invite.email, username);
      if (!mailResult.success) {
        console.warn("Welcome email not sent:", mailResult.error);
      }

      return res.status(201).json({
        status: "OK",
        message: "Conta criada e convite aceito com sucesso",
        data: {
          user_id: newUserId,
          avatar_url: profileImageUrl,
          organization: {
            id: invite.org_id,
            name: invite.org_name,
            unique_name: invite.org_unique_name,
          },
          role: invite.role,
        },
      });
    } catch (error) {
      console.error("Erro ao aceitar convite:", error);
      res.status(500).json({ error: "Erro ao aceitar convite" });
    }
  }

  async getPendingInvites(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res.status(404).json({ error: "Organização não encontrada" });
      }

      const invites = await this.organizationsRepository.getPendingOrgInvites(
        currentOrg.id
      );

      res.status(200).json({
        status: "OK",
        data: invites,
      });
    } catch (error) {
      console.error("Erro ao buscar convites:", error);
      res.status(500).json({ error: "Erro ao buscar convites pendentes" });
    }
  }

  async cancelInvite(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { invite_id } = req.params;

      const invite =
        await this.organizationsRepository.findOrgInviteByToken(invite_id);
      if (!invite) {
        return res.status(404).json({ error: "Convite não encontrado" });
      }

      const isMember = await this.organizationsRepository.isMember(
        invite.org_id,
        userId
      );
      if (!isMember) {
        return res
          .status(403)
          .json({ error: "Sem permissão para cancelar este convite" });
      }

      await this.organizationsRepository.deleteOrgInvite(invite_id);

      res.status(200).json({
        status: "OK",
        message: "Convite cancelado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao cancelar convite:", error);
      res.status(500).json({ error: "Erro ao cancelar convite" });
    }
  }
}

module.exports = new OrganizationMembersController();
