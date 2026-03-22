const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");

const DOMAIN_REGEX =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

class OrganizationsBaseController {
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

  _normalizeDomain(domain) {
    if (!domain || typeof domain !== "string") {
      return null;
    }

    const normalized = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*/, "");

    return normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
  }

  _validateDomainName(domain) {
    const normalized = this._normalizeDomain(domain);

    if (!normalized || !DOMAIN_REGEX.test(normalized)) {
      throw new Error(
        "Domínio inválido. Use um domínio válido como example.com"
      );
    }

    return normalized;
  }

  _validateOrgDomains(domains) {
    if (!domains) return null;
    if (!Array.isArray(domains)) {
      throw new Error("org_domains deve ser um array");
    }

    const validatedDomains = domains
      .map((domain) => {
        try {
          return this._validateDomainName(domain);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean);

    return validatedDomains.length > 0 ? validatedDomains : null;
  }
}

module.exports = OrganizationsBaseController;
