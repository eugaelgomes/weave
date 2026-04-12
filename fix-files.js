const fs = require('fs');

// Fix routes
const routesPath = '/home/gaelgomes/projetos/weave-notes/server/src/modules/users/users.routes.js';
let routesContent = fs.readFileSync(routesPath, 'utf8');

routesContent = routesContent.replace(
  'const userController = require("@/modules/users/users.controller");',
  `const CreateUsersController = require("@/modules/users/controllers/create-users.controller");
const DeleteUsersController = require("@/modules/users/controllers/delete-users.controller");
const SearchUsersController = require("@/modules/users/controllers/search-users.controllers");
const UserDataController = require("@/modules/users/controllers/user-data.controller");`
);

routesContent = routesContent.replace(/userController\.createUser\.bind\(userController\)/g, 'CreateUsersController.createUser.bind(CreateUsersController)');
routesContent = routesContent.replace(/userController\.activateAccount\.bind\(userController\)/g, 'CreateUsersController.activateAccount.bind(CreateUsersController)');
routesContent = routesContent.replace(/userController\.getProfile\.bind\(userController\)/g, 'UserDataController.getProfile.bind(UserDataController)');
routesContent = routesContent.replace(/userController\.updateProfile\.bind\(userController\)/g, 'UserDataController.updateProfile.bind(UserDataController)');
routesContent = routesContent.replace(/userController\.searchUsers\(req, res, next\)/g, 'SearchUsersController.searchUsers(req, res, next)');
routesContent = routesContent.replace(/userController\.getProfileImage\.bind\(userController\)/g, 'UserDataController.getProfileImage.bind(UserDataController)');
routesContent = routesContent.replace(/userController\.getProfileImageInfo\.bind\(userController\)/g, 'UserDataController.getProfileImageInfo.bind(UserDataController)');
routesContent = routesContent.replace(/userController\.requestDeleteUser\.bind\(userController\)/g, 'DeleteUsersController.requestDeleteUser.bind(DeleteUsersController)');
routesContent = routesContent.replace(/userController\.confirmDeleteUser\.bind\(userController\)/g, 'DeleteUsersController.confirmDeleteUser.bind(DeleteUsersController)');

fs.writeFileSync(routesPath, routesContent);

console.log('Routes updated');
