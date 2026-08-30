const { prisma } = require("@theweave/shared");

class TeamsRepository {
  async listWorkspaceTeams(workspaceId) {
    return await prisma.teams.findMany({
      orderBy: {
        name: "asc",
      },
      where: {
        deleted: false,
        workspace_id: workspaceId,
      },
    });
  }

  async getRootTeams(workspaceId) {
    return await prisma.teams.findMany({
      orderBy: {
        name: "asc",
      },
      where: {
        deleted: false,
        parent_team_id: null,
        workspace_id: workspaceId,
      },
    });
  }

  async getTeamById(teamId, workspaceId) {
    return await prisma.teams.findFirst({
      where: {
        deleted: false,
        id: teamId,
        workspace_id: workspaceId,
      },
    });
  }

  async getTeamBySlug(workspaceId, slug) {
    return await prisma.teams.findFirst({
      where: {
        deleted: false,
        slug: slug,
        workspace_id: workspaceId,
      },
    });
  }

  async getMatchingSlugs(workspaceId, slugBase) {
    const teams = await prisma.teams.findMany({
      select: {
        slug: true,
      },
      where: {
        deleted: false,
        slug: {
          startsWith: slugBase,
        },
        workspace_id: workspaceId,
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
        color,
        created_by: createdBy,
        description,
        icon: icon || {},
        name,
        parent_team_id: parentTeamId || null,
        properties: properties || {},
        slug,
        visibility: visibility || "PRIVATE",
        workspace_id: workspaceId,
      },
    });
  }

  async updateTeam(teamId, workspaceId, fields = {}, updatedBy) {
    const dataToUpdate = {};
    const allowedFields = [
      "name",
      "slug",
      "description",
      "properties",
      "active",
      "parent_team_id",
      "color",
      "icon",
      "visibility",
    ];

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

    return await prisma.teams
      .updateMany({
        data: dataToUpdate,
        where: {
          deleted: false,
          id: teamId,
          workspace_id: workspaceId,
        },
      })
      .then(() => this.getTeamById(teamId, workspaceId));
  }

  async softDeleteTeam(teamId, workspaceId, deletedBy) {
    return await prisma.teams
      .updateMany({
        data: {
          active: false,
          deleted: true,
          deleted_at: new Date(),
          deleted_by: deletedBy,
        },
        where: {
          deleted: false,
          id: teamId,
          workspace_id: workspaceId,
        },
      })
      .then(() => this.getTeamById(teamId, workspaceId)); // Return null since it's deleted now, or the soft-deleted object? In Prisma updateMany returns count.
  }

  async listTeamMembers(teamId, workspaceId) {
    return await prisma.team_members.findMany({
      include: {
        users_team_members_user_idTousers: {
          select: {
            avatar_url: true,
            email: true,
            name: true,
            username: true,
          },
        },
        workspace_roles: true,
      },
      orderBy: {
        users_team_members_user_idTousers: {
          name: "asc",
        },
      },
      where: {
        deleted: false,
        team_id: teamId,
        teams: {
          workspace_id: workspaceId,
        },
      },
    });
  }

  async getTeamMember(teamId, workspaceId, userId) {
    return await prisma.team_members.findFirst({
      include: {
        workspace_roles: true,
      },
      where: {
        deleted: false,
        team_id: teamId,
        teams: {
          workspace_id: workspaceId,
        },
        user_id: userId,
      },
    });
  }

  async addTeamMember(teamId, workspaceId, userId, roleId, addedBy) {
    // Check if team belongs to workspace first
    const team = await this.getTeamById(teamId, workspaceId);
    if (!team) return null;

    // Use upsert to handle reactivations
    const existing = await prisma.team_members.findFirst({
      where: { team_id: teamId, user_id: userId },
    });

    if (existing) {
      return await prisma.team_members.update({
        data: {
          added_by: addedBy,
          deleted: false,
          deleted_at: null,
          role_id: roleId,
          suspended: false,
          updated_at: new Date(),
        },
        where: { id: existing.id },
      });
    }

    return await prisma.team_members.create({
      data: {
        added_by: addedBy,
        role_id: roleId,
        team_id: teamId,
        user_id: userId,
      },
    });
  }

  async updateTeamMemberRole(teamId, workspaceId, userId, roleId) {
    const existing = await this.getTeamMember(teamId, workspaceId, userId);
    if (!existing) return null;

    return await prisma.team_members.update({
      data: {
        role_id: roleId,
        updated_at: new Date(),
      },
      where: { id: existing.id },
    });
  }

  async removeTeamMember(teamId, workspaceId, userId, _removedBy) {
    const existing = await this.getTeamMember(teamId, workspaceId, userId);
    if (!existing) return null;

    return await prisma.team_members.update({
      data: {
        deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
        // removed_by doesn't exist on team_members schema yet, so skipping or add it to schema later
      },
      where: { id: existing.id },
    });
  }
}

module.exports = new TeamsRepository();
