/**
 * @typedef {Object} Team
 * @property {string} id
 * @property {string} workspace_id
 * @property {string|null} parent_team_id
 * @property {string} name
 * @property {string} slug
 * @property {string|null} description
 * @property {any} properties
 * @property {boolean} active
 * @property {string|null} color
 * @property {any} icon
 * @property {string} visibility
 * @property {boolean} deleted
 * @property {string|null} created_by
 * @property {string|null} updated_by
 * @property {string|null} deleted_by
 * @property {Date} created_at
 * @property {Date} updated_at
 * @property {Date|null} deleted_at
 */

/**
 * @typedef {Object} TeamMember
 * @property {string} id
 * @property {string} team_id
 * @property {string} user_id
 * @property {string} role_id
 * @property {string|null} added_by
 * @property {boolean} suspended
 * @property {boolean} deleted
 * @property {Date|null} deleted_at
 * @property {Date} created_at
 * @property {Date} updated_at
 * @property {Object} [users_team_members_user_idTousers]
 * @property {Object} [workspace_roles]
 */

const { prisma } = require("@theweave/database");

class TeamsRepository {
  /**
   * @param {string} workspaceId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Team[]>}
   */
  async listWorkspaceTeams(workspaceId, client = prisma) {
    return await client.teams.findMany({
      orderBy: {
        name: "asc",
      },
      where: {
        deleted: false,
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * @param {string} workspaceId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Team[]>}
   */
  async getRootTeams(workspaceId, client = prisma) {
    return await client.teams.findMany({
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

  /**
   * @param {string} teamId
   * @param {string} workspaceId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Team|null>}
   */
  async getTeamById(teamId, workspaceId, client = prisma) {
    return await client.teams.findFirst({
      where: {
        deleted: false,
        id: teamId,
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * @param {string} workspaceId
   * @param {string} slug
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Team|null>}
   */
  async getTeamBySlug(workspaceId, slug, client = prisma) {
    return await client.teams.findFirst({
      where: {
        deleted: false,
        slug,
        workspace_id: workspaceId,
      },
    });
  }

  /**
   * @param {string} workspaceId
   * @param {string} slugBase
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<string[]>}
   */
  async getMatchingSlugs(workspaceId, slugBase, client = prisma) {
    const teams = await client.teams.findMany({
      select: {
        slug: true,
      },
      where: {
        deleted: false,
        slug: { startsWith: slugBase },
        workspace_id: workspaceId,
      },
    });
    return teams.map((team) => team.slug);
  }

  /**
   * @param {Object} data
   * @param {string} data.workspaceId
   * @param {string} [data.parentTeamId]
   * @param {string} data.name
   * @param {string} data.slug
   * @param {string} [data.description]
   * @param {any} [data.properties]
   * @param {string} [data.color]
   * @param {any} [data.icon]
   * @param {import('@prisma/client').visibility_enum} [data.visibility]
   * @param {string} [data.createdBy]
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Team>}
   */
  async createTeam(
    {
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
    },
    client = prisma
  ) {
    return await client.teams.create({
      data: {
        color: color || null,
        created_by: createdBy || null,
        description: description || null,
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

  /**
   * @param {string} teamId
   * @param {string} workspaceId
   * @param {Object} fields
   * @param {string} [updatedBy]
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Team|null>}
   */
  async updateTeam(teamId, workspaceId, fields = {}, updatedBy, client = prisma) {
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

    const data = {};
    for (const key of allowedFields) {
      if (fields[key] !== undefined) {
        data[key] = fields[key];
      }
    }

    if (Object.keys(data).length === 0) {
      return this.getTeamById(teamId, workspaceId, client);
    }

    if (updatedBy) {
      data.updated_by = updatedBy;
    }

    const result = await client.teams.updateMany({
      data: {
        ...data,
        updated_at: new Date(),
      },
      where: {
        deleted: false,
        id: teamId,
        workspace_id: workspaceId,
      },
    });

    if (result.count === 0) return null;
    return this.getTeamById(teamId, workspaceId, client);
  }

  /**
   * @param {string} teamId
   * @param {string} workspaceId
   * @param {string} deletedBy
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Team|null>}
   */
  async softDeleteTeam(teamId, workspaceId, deletedBy, client = prisma) {
    const result = await client.teams.updateMany({
      data: {
        active: false,
        deleted: true,
        deleted_at: new Date(),
        deleted_by: deletedBy,
        updated_at: new Date(),
      },
      where: {
        deleted: false,
        id: teamId,
        workspace_id: workspaceId,
      },
    });

    if (result.count === 0) return null;
    return await client.teams.findFirst({
      where: { id: teamId },
    });
  }

  /**
   * @param {string} teamId
   * @param {string} workspaceId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<TeamMember[]>}
   */
  async listTeamMembers(teamId, workspaceId, client = prisma) {
    return await client.team_members.findMany({
      include: {
        users_team_members_user_idTousers: {
          select: {
            avatar_url: true,
            email: true,
            name: true,
            username: true,
          },
        },
        workspace_roles: {
          select: {
            description: true,
            id: true,
            name: true,
            permissions: true,
          },
        },
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

  /**
   * @param {string} teamId
   * @param {string} workspaceId
   * @param {string} userId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<TeamMember|null>}
   */
  async getTeamMember(teamId, workspaceId, userId, client = prisma) {
    return await client.team_members.findFirst({
      include: {
        workspace_roles: {
          select: {
            description: true,
            id: true,
            name: true,
            permissions: true,
          },
        },
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

  /**
   * @param {string} teamId
   * @param {string} workspaceId
   * @param {string} userId
   * @param {string} roleId
   * @param {string} addedBy
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<TeamMember|null>}
   */
  async addTeamMember(teamId, workspaceId, userId, roleId, addedBy, client = prisma) {
    const team = await this.getTeamById(teamId, workspaceId, client);
    if (!team) return null;

    return await client.team_members.upsert({
      create: {
        added_by: addedBy,
        role_id: roleId,
        team_id: teamId,
        user_id: userId,
      },
      update: {
        added_by: addedBy,
        deleted: false,
        deleted_at: null,
        role_id: roleId,
        suspended: false,
        updated_at: new Date(),
      },
      where: {
        team_id_user_id: {
          team_id: teamId,
          user_id: userId,
        },
      },
    });
  }

  /**
   * @param {string} teamId
   * @param {string} workspaceId
   * @param {string} userId
   * @param {string} roleId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<TeamMember|null>}
   */
  async updateTeamMemberRole(teamId, workspaceId, userId, roleId, client = prisma) {
    const existing = await this.getTeamMember(teamId, workspaceId, userId, client);
    if (!existing) return null;

    return await client.team_members.update({
      data: {
        role_id: roleId,
        updated_at: new Date(),
      },
      where: {
        id: existing.id,
      },
    });
  }

  /**
   * @param {string} teamId
   * @param {string} workspaceId
   * @param {string} userId
   * @param {string} _removedBy
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<TeamMember|null>}
   */
  async removeTeamMember(teamId, workspaceId, userId, _removedBy, client = prisma) {
    const existing = await this.getTeamMember(teamId, workspaceId, userId, client);
    if (!existing) return null;

    return await client.team_members.update({
      data: {
        deleted: true,
        deleted_at: new Date(),
        updated_at: new Date(),
      },
      where: {
        id: existing.id,
      },
    });
  }
}

module.exports = new TeamsRepository();
