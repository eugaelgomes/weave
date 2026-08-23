/**
 * @module services/storage.service
 * @description Compatibility layer re-exporting the storage service from @theweave/database.
 */
const { storageService, SpacesService } = require("@theweave/database");

module.exports = storageService;
module.exports.SpacesService = SpacesService;
