const { prisma } = require("@theweave/shared");

class TeamsRepository {
  async listWorkspaceTeams(workspaceId) {
    return await prisma.teams.findMany({
      where: {
        workspace_id: workspaceId,
        deleted: false,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getRootTeams(workspaceId) {
    return await prisma.teams.findMany({
      where: {
        workspace_id: workspaceId,
        parent_team_id: null,
        deleted: false,
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  async getTeamById(teamId, workspaceId) {
    return await prisma.teams.findFirst({
      where: {
        id: teamId,
        workspace_id: workspaceId,
        deleted: false,
      },
    });
  }

  async getTeamBySlug(workspaceId, slug) {
    return await prisma.teams.findFirst({
      where: {
        workspace_id: workspaceId,
        slug: slug,
        deleted: false,
      },
    });
  }

  async getMatchingSlugs(workspaceId, slugBase) {
    const teams = await prisma.teams.findMany({
      where: {
        workspace_id: workspaceId,
        deleted: false,
        slug: {
          startsWith: slugBase,
        },
      },
      select: {
        slug: true,
      },
    });
    return teams.map((t) => t.slug);
  }

  async createTeam({
    workspaceId,
    parentTeamId,
    name,
    slug,
    description,
    properties,
    color,
    icon,
    visibility,
    createdBy,
  }) {
    return await prisma.teams.create({
      data: {
        workspace_id: workspaceId,
        parent_team_id: parentTeamId || null,
        name,
        slug,
        description,
        properties: properties || {},
        color,
        icon: icon || {},
        visibility: visibility || "PRIVATE",
        created_by: createdBy,
      },
    });
  }

  async updateTeam(teamId, workspaceId, fields = {}, updatedBy) {
    const dataToUpdate = {};
    const allowedFields = ["name", "slug", "description", "properties", "active", "parent_team_id", "color", "icon", "visibility"];

    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        dataToUpdate[key] = fields[key];
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return this.getTeamById(teamId, workspaceId);
    }

    if (updatedBy) {
      dataToUpdate.updated_by = updatedBy;
    }
    dataToUpdate.updated_at = new Date();

    return await prisma.teams.updateMany({
      where: {
        id: teamId,
        workspace_id: workspaceId,
        deleted: false,
      },
      data: dataToUpdate,
    }).then(() => this.getTeamById(teamId, workspaceId));
  }

  async softDeleteTeam(teamId, workspaceId, deletedBy) {
    return await prisma.teams.updateMany({
      where: {
        id: teamId,
        workspace_id: workspaceId,
        deleted: false,
      },
      data: {
        deleted: true,
        active: false,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    }).then(() => this.getTeamById(teamId, workspaceId)); // Return null since it's deleted now, or the soft-deleted object? In Prisma updateMany returns count.
  }

  async listTeamMembers(teamId, workspaceId) {
    return await prisma.team_members.findMany({
      where: {
        team_id: teamId,
        deleted: false,
        teams: {
          workspace_id: workspaceId,
        },
      },
      include: {
        users_team_members_user_idTousers: {
          select: {
            name: true,
            username: true,
            email: true,
            avatar_url: true,
          },
        },
        workspace_roles: true,
      },
      orderBy: {
        users_team_members_user_idTousers: {
          name: "asc",
        },
      },
    });
  }

  async getTeamMember(teamId, workspaceId, userId) {
    return await prisma.team_members.findFirst({
      where: {
        team_id: teamId,
        user_id: userId,
        deleted: false,
        teams: {
          workspace_id: workspaceId,
        },
      },
      include: {
        workspace_roles: true,
      }
    });
  }

  async addTeamMember(teamId, workspaceId, userId, roleId, addedBy) {
    // Check if team belongs to workspace first
    const team = await this.getTeamById(teamId, workspaceId);
    if (!team) return null;

    // Use upsert to handle reactivations
    const existing = await prisma.team_members.findFirst({
      where: { team_id: teamId, user_id: userId }
    });

    if (existing) {
      return await prisma.team_members.update({
        where: { id: existing.id },
        data: {
          deleted: false,
          role_id: roleId,
          added_by: addedBy,
          suspended: false,
          deleted_at: null,
          updated_at: new Date(),
        },
      });
    }

    return await prisma.team_members.create({
      data: {
        team_id: teamId,
        user_id: userId,
        role_id: roleId,
        added_by: addedBy,
      },
    });
  }

  async updateTeamMemberRole(teamId, workspaceId, userId, roleId) {
    const existing = await this.getTeamMember(teamId, workspaceId, userId);
    if (!existing) return null;

    return await prisma.team_members.update({
      where: { id: existing.id },
      data: {
        role_id: roleId,
        updated_at: new Date(),
      },
    });
  }

  async removeTeamMember(teamId, workspaceId, userId, removedBy) {
    const existing = await this.getTeamMember(teamId, workspaceId, userId);
    if (!existing) return null;

    return await prisma.team_members.update({
      where: { id: existing.id },
      data: {
        deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        // removed_by doesn't exist on team_members schema yet, so skipping or add it to schema later
      },
    });
  }
}

module.exports = new TeamsRepository();
