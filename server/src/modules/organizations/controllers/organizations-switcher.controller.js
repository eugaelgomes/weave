const OrganizationsBaseController = require("./base-controller");
const organizationsRepository = require("../repositories/organizations.repository");
const areasRepository = require("../repositories/areas.repository");
const signinRepository = require("@/modules/authentication/repositories/signin.repository");
const { buildJwtPayload } = require("@/modules/authentication/schemas/jwt-payload.schema");
const { presignObjectFields } = require("@/utils/storage.util");

/**
 * Controller handling organization listing and workspace context switching for multi-tenant users.
 */
class OrganizationsSwitcherController extends OrganizationsBaseController {
  /**
   * List all active organizations where the logged-in user is a member.
   */
  async listMyOrganizations(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const orgs = await organizationsRepository.getUserOrganizationsWithMembership(userId);

      const protectedOrgs = await Promise.all(
        orgs.map(async (org) => {
          const presigned = await presignObjectFields(org, ["logo_url"], {
            expiresIn: 12 * 60 * 60,
            userId,
          });
          return {
            id: org.id,
            joined_at: org.joined_at,
            logo_url: presigned.logo_url || null,
            member_role: org.member_role,
            org_name: org.org_name,
            unique_name: org.unique_name,
          };
        })
      );

      res.status(200).json({
        data: protectedOrgs,
        success: true,
      });
    } catch (error) {
      console.error("Error listing user organizations:", error);
      next(error);
    }
  }

  /**
   * Switch the active organization context in the user's session.
   */
  async switchOrganization(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { organizationId } = req.body;
      if (!organizationId) {
        return res.status(400).json({ error: "organizationId is required", success: false });
      }

      // Check membership
      const role = await organizationsRepository.getMembershipRole(organizationId, userId);
      if (!role) {
        return res.status(403).json({
          error: "You are not an active member of this organization",
          success: false,
        });
      }

      // Fetch user full data to rebuild session
      const user = await signinRepository.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found", success: false });
      }

      // Fetch organization details
      const userOrgs = await organizationsRepository.getUserOrganizationsWithMembership(userId);
      const targetOrg = userOrgs.find((o) => o.id === organizationId);

      if (!targetOrg) {
        return res.status(404).json({ error: "Organization not found", success: false });
      }

      const organization = {
        id: targetOrg.id,
        logo_url: targetOrg.logo_url,
        member_role: targetOrg.member_role,
        org_name: targetOrg.org_name,
        unique_name: targetOrg.unique_name,
      };

      // Get default area for this organization if any
      let defaultArea = null;
      try {
        defaultArea = await areasRepository.getDefaultArea(organizationId);
      } catch {
        // Area optional fallback
      }

      const payload = buildJwtPayload(user, organization, defaultArea);

      req.session.user = payload;
      req.session.userId = user.user_id;

      res.status(200).json({
        message: "Switched organization successfully",
        success: true,
        user_organization: {
          id: organization.id,
          member_role: role,
          name: organization.org_name,
          unique_name: organization.unique_name,
        },
      });
    } catch (error) {
      console.error("Error switching organization:", error);
      next(error);
    }
  }
}

module.exports = new OrganizationsSwitcherController();
