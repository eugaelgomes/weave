const fs = require('fs');
const content = fs.readFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/users.repository.js', 'utf8');

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
    // Preceding JSDoc
    let prefixStart = start;
    while(prefixStart > 0 && (content[prefixStart-1] === ' ' || content[prefixStart-1] === '\n' || content[prefixStart-1] === '\t' || content[prefixStart-1] === '*' || content[prefixStart-1] === '/')) {
        prefixStart--;
    }
    return content.slice(prefixStart, end);
};

const baseStr = `const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");

class BaseRepository {
  constructor() {
    this.executeQuery = executeQuery;
    this.defaultAppPreferences = defaultAppPreferences;
  }
}
module.exports = BaseRepository;
`;

fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/repositories/base.repository.js', baseStr);

const createRepoStr = `const BaseRepository = require('./base.repository');
const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");

class CreateUsersRepository extends BaseRepository {
${getMethod('createUser')}
${getMethod('createGithubUser')}
}
module.exports = new CreateUsersRepository();
`;
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/repositories/create-users.repository.js', createRepoStr);

const dataRepoStr = `const BaseRepository = require('./base.repository');
const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");

class UserDataRepository extends BaseRepository {
${getMethod('getProfileImage')}
${getMethod('updateProfileImage')}
${getMethod('updateUserProfile')}
${getMethod('updateUserPassword')}
${getMethod('setDefaultAppPreferences')}
${getMethod('updateUserPreferences')}
${getMethod('getUserPreferences')}
}
module.exports = new UserDataRepository();
`;
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/repositories/user-data.repository.js', dataRepoStr);

const searchRepoStr = `const BaseRepository = require('./base.repository');
const { executeQuery } = require("@/database/connection");

class SearchUsersRepository extends BaseRepository {
${getMethod('findAll')}
${getMethod('findByUsernameOrEmail')}
${getMethod('getUserById')}
${getMethod('getUserByUsername')}
${getMethod('searchUsers')}
${getMethod('findById')}
${getMethod('findByGithubId')}
}
module.exports = new SearchUsersRepository();
`;
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/repositories/search-users.repository.js', searchRepoStr);

const tokensRepoStr = `const BaseRepository = require('./base.repository');
const { executeQuery } = require("@/database/connection");

class UserTokensRepository extends BaseRepository {
${getMethod('deactivateOldEmailTokens')}
${getMethod('createEmailChangeToken')}
${getMethod('findEmailChangeToken')}
${getMethod('getDataToUpdate')}
${getMethod('clearDataToUpdate')}
${getMethod('deactivateEmailToken')}
${getMethod('createEmailActivationToken')}
${getMethod('findEmailActivationToken')}
${getMethod('findEmailActivationTokenByCodeAndEmail')}
${getMethod('verifyUserEmail')}
}
module.exports = new UserTokensRepository();
`;
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/repositories/user-tokens.repository.js', tokensRepoStr);

const deleteRepoStr = `const BaseRepository = require('./base.repository');
const { executeQuery } = require("@/database/connection");

class DeleteUsersRepository extends BaseRepository {
${getMethod('createDeleteAccountToken')}
${getMethod('findDeleteAccountToken')}
${getMethod('deleteUser')}
${getMethod('deactivateDeleteAccountToken')}
}
module.exports = new DeleteUsersRepository();
`;
fs.writeFileSync('/home/gaelgomes/projetos/weave-notes/server/src/modules/users/repositories/delete-users.repository.js', deleteRepoStr);

