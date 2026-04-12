const fs = require('fs');

const repMap = {
  'UserRepository.': 'CreateUsersRepository.',
  'UserRepository.getProfileImage': 'UserDataRepository.getProfileImage',
  'UserRepository.updateProfileImage': 'UserDataRepository.updateProfileImage',
  'UserRepository.findB': 'SearchUsersRepository.findB',
  'UserRepository.findE': 'UserTokensRepository.findE',
  'UserRepository.deactivateE': 'UserTokensRepository.deactivateE',
  'UserRepository.verifyU': 'UserTokensRepository.verifyU',
  'UserRepository.createE': 'UserTokensRepository.createE',
  '@/modules/users/users.repository': '@/modules/users/repositories/create-users.repository',
};

const controllersDir = '/home/gaelgomes/projetos/weave-notes/server/src/modules/users/controllers/';
const files = fs.readdirSync(controllersDir);

files.forEach(f => {
  if (!f.endsWith('.js') || f === 'base.controller.js') return;
  const p = controllersDir + f;
  let c = fs.readFileSync(p, 'utf8');

  // Replace repo imports
  c = c.replace(/const UserRepository = require\("@\/modules\/users\/users\.repository"\);/g, 
    `const CreateUsersRepository = require("@/modules/users/repositories/create-users.repository");
const UserDataRepository = require("@/modules/users/repositories/user-data.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const DeleteUsersRepository = require("@/modules/users/repositories/delete-users.repository");`
  );

  c = c.replace(/UserRepository\.createUser/g, 'CreateUsersRepository.createUser');
  c = c.replace(/UserRepository\.createGithubUser/g, 'CreateUsersRepository.createGithubUser');
  c = c.replace(/UserRepository\.getProfileImage/g, 'UserDataRepository.getProfileImage');
  c = c.replace(/UserRepository\.updateProfileImage/g, 'UserDataRepository.updateProfileImage');
  c = c.replace(/UserRepository\.updateUserProfile/g, 'UserDataRepository.updateUserProfile');
  c = c.replace(/UserRepository\.updateUserPassword/g, 'UserDataRepository.updateUserPassword');
  c = c.replace(/UserRepository\.setDefaultAppPreferences/g, 'UserDataRepository.setDefaultAppPreferences');
  c = c.replace(/UserRepository\.updateUserPreferences/g, 'UserDataRepository.updateUserPreferences');
  c = c.replace(/UserRepository\.getUserPreferences/g, 'UserDataRepository.getUserPreferences');
  
  c = c.replace(/UserRepository\.findAll/g, 'SearchUsersRepository.findAll');
  c = c.replace(/UserRepository\.findByUsernameOrEmail/g, 'SearchUsersRepository.findByUsernameOrEmail');
  c = c.replace(/UserRepository\.getUserById/g, 'SearchUsersRepository.getUserById');
  c = c.replace(/UserRepository\.getUserByUsername/g, 'SearchUsersRepository.getUserByUsername');
  c = c.replace(/UserRepository\.searchUsers/g, 'SearchUsersRepository.searchUsers');
  c = c.replace(/UserRepository\.findById/g, 'SearchUsersRepository.findById');
  c = c.replace(/UserRepository\.findByGithubId/g, 'SearchUsersRepository.findByGithubId');

  c = c.replace(/UserRepository\.deactivateOldEmailTokens/g, 'UserTokensRepository.deactivateOldEmailTokens');
  c = c.replace(/UserRepository\.createEmailChangeToken/g, 'UserTokensRepository.createEmailChangeToken');
  c = c.replace(/UserRepository\.findEmailChangeToken/g, 'UserTokensRepository.findEmailChangeToken');
  c = c.replace(/UserRepository\.getDataToUpdate/g, 'UserTokensRepository.getDataToUpdate');
  c = c.replace(/UserRepository\.clearDataToUpdate/g, 'UserTokensRepository.clearDataToUpdate');
  c = c.replace(/UserRepository\.deactivateEmailToken/g, 'UserTokensRepository.deactivateEmailToken');
  c = c.replace(/UserRepository\.createEmailActivationToken/g, 'UserTokensRepository.createEmailActivationToken');
  c = c.replace(/UserRepository\.findEmailActivationToken/g, 'UserTokensRepository.findEmailActivationToken');
  c = c.replace(/UserRepository\.findEmailActivationTokenByCodeAndEmail/g, 'UserTokensRepository.findEmailActivationTokenByCodeAndEmail');
  c = c.replace(/UserRepository\.verifyUserEmail/g, 'UserTokensRepository.verifyUserEmail');

  c = c.replace(/UserRepository\.createDeleteAccountToken/g, 'DeleteUsersRepository.createDeleteAccountToken');
  c = c.replace(/UserRepository\.findDeleteAccountToken/g, 'DeleteUsersRepository.findDeleteAccountToken');
  c = c.replace(/UserRepository\.deleteUser/g, 'DeleteUsersRepository.deleteUser');
  c = c.replace(/UserRepository\.deactivateDeleteAccountToken/g, 'DeleteUsersRepository.deactivateDeleteAccountToken');

  fs.writeFileSync(p, c);
});
console.log('Controllers patched.');
