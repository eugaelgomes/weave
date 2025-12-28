const organizationsRepository = require("@/repositories/organizations");
const UserRepository = require("@/repositories/users");
const imageUtils = require("@/middlewares/data/image-utils");
const crypto = require("crypto");
const {
  send_organization_invite,
} = require("@/services/email/templates/invite-member/mail");
const {
  normalizeOrganizationName,
  generateUniqueOrganizationName,
  normalizeOrganizationProperties,
  updateOrganizationProperties,
  getDefaultOrganizationProperties,
  validRoles,
} = require("./normalizer");

class OrganizationsController {
  constructor() {
    this.organizationsRepository = organizationsRepository;
  }

  _validateAuthentication(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }
    return userId;
  }

  async _getUserOrganization(userId) {
    const organizations =
      await this.organizationsRepository.getOrgsByUserId(userId);
    return organizations.find((org) => !org.deleted) || null;
  }

  _validateRequiredFields(data) {
    if (!data.org_name || typeof data.org_name !== "string") {
      throw new Error("Nome da organização é obrigatório");
    }
    if (data.org_name.trim().length < 2) {
      throw new Error("Nome da organização deve ter pelo menos 2 caracteres");
    }
    if (data.org_name.length > 100) {
      throw new Error("Nome da organização deve ter no máximo 100 caracteres");
    }
  }

  _validateOrgDomains(domains) {
    if (!domains) return null;
    if (!Array.isArray(domains))
      throw new Error("org_domains deve ser um array");

    const domainRegex =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

    const validatedDomains = domains.filter((domain) => {
      if (typeof domain !== "string") return false;
      return domainRegex.test(domain.trim());
    });

    return validatedDomains.length > 0 ? validatedDomains : null;
  }

  async createOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const existingOrg = await this._getUserOrganization(userId);
      if (existingOrg) {
        return res.status(400).json({
          success: false,
          error: "Usuário já possui uma organização. Use PUT para atualizar.",
        });
      }

      const {
        org_name,
        unique_name: providedUniqueName,
        logo_url,
        banner_url,
        description,
        properties,
        org_domains,
      } = req.body;

      this._validateRequiredFields({ org_name });

      let unique_name;
      if (providedUniqueName) {
        unique_name = normalizeOrganizationName(providedUniqueName);
        if (!unique_name) {
          throw new Error("Nome único fornecido é inválido após normalização");
        }

        const existingNames =
          await this.organizationsRepository.getAvailableOrgNames(unique_name);
        if (existingNames.includes(unique_name)) {
          throw new Error(`Nome único '${unique_name}' já está em uso`);
        }
      } else {
        unique_name = await generateUniqueOrganizationName(org_name);
      }

      const normalizedProperties = properties
        ? normalizeOrganizationProperties(properties)
        : getDefaultOrganizationProperties();

      const validatedDomains = this._validateOrgDomains(org_domains);

      const newOrganization = await this.organizationsRepository.createOrgs(
        userId,
        org_name.trim(),
        unique_name,
        logo_url || null,
        banner_url || null,
        description?.trim() || "Type description here...",
        normalizedProperties,
        validatedDomains
      );

      res.status(201).json({
        success: true,
        message: "Organização criada com sucesso",
        data: newOrganization,
      });
    } catch (error) {
      console.error("Erro ao criar organização:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao criar organização",
      });
    }
  }

  async getOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Organização não encontrada",
          message: "Usuário ainda não possui uma organização",
        });
      }

      // Construir resposta formatada
      const formattedOrganization = {
        created_at: organization.created_at,
        updated_at: organization.updated_at,
        identity: {
          id: organization.id,
          user_id: organization.user_id,
          org_name: organization.org_name,
          unique_name: organization.unique_name,
          logo_url: organization.logo_url,
          banner_url: organization.banner_url,
          description: organization.description,
        },
        properties: organization.properties,
        org_domains: organization.org_domains || [],
        owners: [
          {
            id: organization.user_id,
            name: organization.name,
            username: organization.username,
            email: organization.email,
            avatar_url: organization.avatar_url,
          },
        ],
        deleted: organization.deleted,
      };

      res
        .status(200)
        .json({ success: true, organization_data: formattedOrganization });
    } catch (error) {
      console.error("Erro ao buscar organização:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao buscar organização" });
    }
  }

  async updateOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const {
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        properties,
        org_domains,
      } = req.body;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      let updatedUniqueName = currentOrg.unique_name;

      if (org_name && org_name !== currentOrg.org_name) {
        this._validateRequiredFields({ org_name });
        updatedUniqueName = await generateUniqueOrganizationName(org_name);
      }

      if (unique_name && unique_name !== currentOrg.unique_name) {
        const normalizedName = normalizeOrganizationName(unique_name);
        const existingNames =
          await this.organizationsRepository.getAvailableOrgNames(
            normalizedName
          );

        if (existingNames.includes(normalizedName)) {
          throw new Error("Nome único já está em uso");
        }
        updatedUniqueName = normalizedName;
      }

      let updatedProperties = currentOrg.properties;
      if (properties) {
        updatedProperties = updateOrganizationProperties(
          currentOrg.properties,
          properties
        );
      }

      const validatedDomains = org_domains
        ? this._validateOrgDomains(org_domains)
        : currentOrg.org_domains;

      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        org_name?.trim() || currentOrg.org_name,
        updatedUniqueName,
        logo_url !== undefined ? logo_url : currentOrg.logo_url,
        banner_url !== undefined ? banner_url : currentOrg.banner_url,
        description !== undefined
          ? description?.trim()
          : currentOrg.description,
        updatedProperties,
        currentOrg.deleted,
        validatedDomains
      );

      res.status(200).json({
        success: true,
        message: "Organização atualizada com sucesso",
        data: updatedOrg,
      });
    } catch (error) {
      console.error("Erro ao atualizar organização:", error);
      const statusCode = error.message.includes("não encontrada") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Erro ao atualizar organização",
      });
    }
  }

  async updateOrganizationProperties(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { properties } = req.body;
      if (!properties || typeof properties !== "object") {
        return res.status(400).json({
          success: false,
          error: "Properties é obrigatório e deve ser um objeto",
        });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const updatedProperties = updateOrganizationProperties(
        currentOrg.properties,
        properties
      );

      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        currentOrg.banner_url,
        currentOrg.description,
        updatedProperties,
        currentOrg.deleted,
        currentOrg.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Propriedades atualizadas com sucesso",
        data: updatedOrg,
      });
    } catch (error) {
      console.error("Erro ao atualizar properties:", error);
      const statusCode = error.message.includes("não encontrada") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Erro ao atualizar properties",
      });
    }
  }

  async deleteOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const deletedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        currentOrg.banner_url,
        currentOrg.description,
        currentOrg.properties,
        true,
        currentOrg.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Organização excluída com sucesso",
        data: deletedOrg,
      });
    } catch (error) {
      console.error("Erro ao excluir organização:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao excluir organização" });
    }
  }

  async restoreOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organizations =
        await this.organizationsRepository.getOrgsByUserId(userId);
      const organization = organizations.find((org) => org.deleted);

      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Nenhuma organização deletada encontrada",
        });
      }

      const restoredOrg = await this.organizationsRepository.updateOrg(
        organization.id,
        userId,
        organization.org_name,
        organization.unique_name,
        organization.logo_url,
        organization.banner_url,
        organization.description,
        organization.properties,
        false,
        organization.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Organização restaurada com sucesso",
        data: restoredOrg,
      });
    } catch (error) {
      console.error("Erro ao restaurar organização:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao restaurar organização" });
    }
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
          error: "Role deve ser 'admin', 'member' ou 'guest'",
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
        success: true,
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

      const owner = await this.organizationsRepository.getOrganizationOwner(
        currentOrg.id
      );
      if (owner && owner.user_id === memberId) {
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
        success: true,
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

      res.status(200).json({ success: true, data: members });
    } catch (error) {
      console.error("Erro ao buscar membros:", error);
      res.status(500).json({ success: false, error: "Erro ao buscar membros" });
    }
  }

  async uploadLogo(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Nenhum arquivo foi enviado" });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const result = await imageUtils.saveOrganizationLogo(
        req.file.buffer,
        req.file.mimetype,
        currentOrg.id
      );

      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, error: "Erro ao salvar logo" });
      }

      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        result.url,
        currentOrg.banner_url,
        currentOrg.description,
        currentOrg.properties,
        currentOrg.deleted,
        currentOrg.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Logo atualizado com sucesso",
        data: {
          organization: updatedOrg,
          upload: {
            url: result.url,
            filename: result.filename,
            size: result.size,
          },
        },
      });
    } catch (error) {
      console.error("Erro ao fazer upload do logo:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao fazer upload do logo" });
    }
  }

  async uploadBanner(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Nenhum arquivo foi enviado" });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const result = await imageUtils.saveOrganizationBanner(
        req.file.buffer,
        req.file.mimetype,
        currentOrg.id
      );

      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, error: "Erro ao salvar banner" });
      }

      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        result.url,
        currentOrg.description,
        currentOrg.properties,
        currentOrg.deleted,
        currentOrg.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Banner atualizado com sucesso",
        data: {
          organization: updatedOrg,
          upload: {
            url: result.url,
            filename: result.filename,
            size: result.size,
          },
        },
      });
    } catch (error) {
      console.error("Erro ao fazer upload do banner:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao fazer upload do banner" });
    }
  }

  // Organization Invites
  async inviteMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { email, role = "member", name, username } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Cargo inválido" });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res.status(404).json({ error: "Organização não encontrada" });
      }

      // Verifica se já é membro
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

      // Verifica se já existe convite pendente
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

      // Cria convite
      const invite = await this.organizationsRepository.createOrgInvite(
        currentOrg.id,
        email,
        role,
        userId,
        name,
        username
      );

      // Busca info do usuário que enviou o convite
      const inviter = await UserRepository.findById(userId);

      // Envia email
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
        success: true,
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

      // Se usuário estiver logado, adiciona diretamente
      if (userId) {
        // Verifica se já é membro
        const isMember = await this.organizationsRepository.isMember(
          invite.org_id,
          userId
        );
        if (isMember) {
          return res
            .status(400)
            .json({ error: "Você já é membro desta organização" });
        }

        // Adiciona membro
        await this.organizationsRepository.addOrganizationMember(
          invite.org_id,
          userId,
          invite.role,
          "active",
          invite.invited_by
        );

        // Marca convite como verificado
        await this.organizationsRepository.verifyOrgInvite(invite.invite_id);

        return res.status(200).json({
          success: true,
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

      // Se não estiver logado, valida campos obrigatórios para criação de conta
      if (!name || !username || !password) {
        return res.status(400).json({
          error:
            "Nome, usuário e senha são obrigatórios para aceitar o convite",
        });
      }

      // Valida se o email do convite corresponde
      if (!invite.email) {
        return res.status(400).json({ error: "Convite sem email associado" });
      }

      // Verifica se o usuário já existe
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

      // Hash da senha
      const bcrypt = require("bcrypt");
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");

      // Cria o novo usuário (sem imagem inicialmente)
      const newUser = await UserRepository.createUser(
        name,
        username,
        invite.email,
        hashedPassword,
        null, // profileImage será atualizada depois se existir
        createdAt
      );

      const newUserId = newUser[0].user_id;
      let profileImageUrl = null;

      // Se tiver imagem, salva usando o id retornado pelo banco
      if (req.file && req.file.buffer) {
        try {
          const saveResult = await imageUtils.saveProfileImage(
            req.file.buffer,
            req.file.mimetype,
            newUserId
          );

          if (saveResult.success) {
            profileImageUrl = saveResult.url;

            // Atualiza o usuário com a URL da imagem
            const updateResult = await UserRepository.updateProfileImage(
              newUserId,
              profileImageUrl
            );

            if (updateResult && updateResult.length > 0) {
              console.log(
                `Avatar URL atualizado para usuário ${newUserId}: ${profileImageUrl}`
              );
            } else {
              console.error(
                `Falha ao atualizar avatar URL para usuário ${newUserId}`
              );
            }
          } else {
            console.error("Failed to upload to Digital Ocean Spaces");
          }
        } catch (imageError) {
          console.error("Erro ao fazer upload da imagem:", imageError);
          // Não retorna erro, apenas log - usuário é criado sem imagem
        }
      }

      // Verifica o email do usuário (aceitar convite já valida o email)
      await UserRepository.verifyUserEmail(newUserId);

      // Adiciona como membro da organização
      await this.organizationsRepository.addOrganizationMember(
        invite.org_id,
        newUserId,
        invite.role,
        "active",
        invite.invited_by
      );

      // Marca convite como verificado
      await this.organizationsRepository.verifyOrgInvite(invite.invite_id);

      // Envia email de boas-vindas (sem token de ativação, pois já está ativado)
      const welcomeMailModule = require("@/services/email/templates/welcome/welcome-mail");
      const { welcome_message } = welcomeMailModule;
      const mailResult = await welcome_message(name, invite.email, username);
      if (!mailResult.success) {
        console.warn("Welcome email not sent:", mailResult.error);
      }

      return res.status(201).json({
        success: true,
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
        success: true,
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

      // Verifica se o usuário pertence à organização do convite
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
        success: true,
        message: "Convite cancelado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao cancelar convite:", error);
      res.status(500).json({ error: "Erro ao cancelar convite" });
    }
  }
}

module.exports = new OrganizationsController();
