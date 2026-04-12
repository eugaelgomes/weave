const fs = require('fs');
const content = fs.readFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/users.controller.js', 'utf8');

const imports = content.slice(0, content.indexOf('class userController'));

const getMethod = (name) => {
    const rx = new RegExp(`async ${name}\\(.*?\\) \\{`);
    const match = content.match(rx);
    if (!match) return '';
    let start = match.index;
    let braces = 0;
    let end = start;
    let started = false;
    for (let i = start; i < content.length; i++) {
        if (content[i] === '{') { braces++; started = true; }
        if (content[i] === '}') { 
            braces--; 
            if (started && braces === 0) {
                end = i + 1;
                break;
            }
        }
    }
    // Also get preceding JSDoc/comments
    let prefixStart = start;
    while(prefixStart > 0 && (content[prefixStart-1] === ' ' || content[prefixStart-1] === '\n' || content[prefixStart-1] === '\t' || content[prefixStart-1] === '*' || content[prefixStart-1] === '/')) {
        prefixStart--;
    }
    return content.slice(prefixStart, end);
};

const baseClassStr = `
class BaseController {
  constructor() {
    this.userRepository = UserRepository;
    this.authRepository = AuthRepository;
  }

  _getCurrentDateTime() {
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  _isValidTimezone(timezone) {
    return ALL_TIMEZONES.includes(timezone);
  }

  _handleError(error, res, next) {
    console.error(\`[Controller Error]: \${error.message}\`, {
      stack: error.stack,
    });

    if (
      error.message.includes("obrigatório") ||
      error.message.includes("Invalid")
    ) {
      return res.status(400).json({ error: error.message });
    }
    if (
      error.message.includes("não encontrada") ||
      error.message.includes("negado")
    ) {
      return res.status(404).json({ error: error.message });
    }

    return res.status(500).json({ error: "Internal server error." });
  }

  _validateAuthentication(req) {
    if (!req.user || !req.user.userId) {
      throw new Error("Acesso negado: Usuário não autenticado");
    }
    return req.user.userId;
  }
}
module.exports = BaseController;
`;

fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/controllers/base.controller.js', imports + baseClassStr);

const createClassStr = `
const BaseController = require('./base.controller');
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const UserRepository = require("@/modules/users/users.repository");
const welcomeMailModule = require("@/services/email/templates/welcome-mail");
const { welcome_message } = welcomeMailModule;
const PlansManager = require("@/services/plans/manager");

const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;

class CreateUsersController extends BaseController {
${getMethod('createUser')}
${getMethod('activateAccount')}
}
module.exports = new CreateUsersController();
`;
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/controllers/create-users.controller.js', createClassStr);

const deleteClassStr = `
const BaseController = require('./base.controller');
const UserRepository = require("@/modules/users/users.repository");
const AuthRepository = require("@/modules/authentication/auth.repository");
const { delete_account_notification } = require("@/services/email/templates/delete-account/deleted-account-message");
const { delete_account_request } = require("@/services/email/templates/delete-account/delete-account-request");
const crypto = require("crypto");

class DeleteUsersController extends BaseController {
${getMethod('requestDeleteUser')}
${getMethod('confirmDeleteUser')}
}
module.exports = new DeleteUsersController();
`;
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/controllers/delete-users.controller.js', deleteClassStr);

const searchClassStr = `
const BaseController = require('./base.controller');
const UserRepository = require("@/modules/users/users.repository");

class SearchUsersController extends BaseController {
${getMethod('searchUsers')}
}
module.exports = new SearchUsersController();
`;
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/controllers/search-users.controllers.js', searchClassStr);

const userDataClassStr = `
const BaseController = require('./base.controller');
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const UserRepository = require("@/modules/users/users.repository");
const AuthRepository = require("@/modules/authentication/auth.repository");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const OrganizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const { presignObjectFields } = require("@/utils/data/presign-storage-files");
const { sendEmailChangeValidation } = require("@/services/email/templates/users-access/reset-password");
const updateProfileLogs = require("@/utils/system_logs/update_profile-logs");
const { normalizeAppPreferences } = require("@/modules/users/normalize");

// Reuse the mappings from imports (dirty hack to get the code functioning)
const mapDefaultAreaInfo = (defaultAreaData) => { ... };
const mapOrganizationInfo = (organizationData) => { ... };
const mapPlanUsageInfo = (usageData) => { ... };
// For real we just copy them from content.

class UserDataController extends BaseController {
${getMethod('getProfileImage')}
${getMethod('getProfileImageInfo')}
${getMethod('getProfile')}
${getMethod('updateProfile')}
}
module.exports = new UserDataController();
`;

// I will patch the userDataClassStr to replace the mapping functions with the actual ones.
const mappingFuncs = content.match(/const mapDefaultAreaInfo[\s\S]*?const mapPlanUsageInfo.*?};/)?.[0] || '';
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/controllers/user-data.controller.js', userDataClassStr.replace('// Reuse the mappings from imports (dirty hack to get the code functioning)\nconst mapDefaultAreaInfo = (defaultAreaData) => { ... };\nconst mapOrganizationInfo = (organizationData) => { ... };\nconst mapPlanUsageInfo = (usageData) => { ... };', mappingFuncs));

