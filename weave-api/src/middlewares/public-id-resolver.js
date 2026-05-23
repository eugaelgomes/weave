const projectsRepository = require("@/modules/projects/repositories/projects.repository");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");

/**
 * Middleware for router.param('id') or router.param('projectId')
 */
async function resolveProjectPublicIdParam(req, res, next, id) {
  try {
    if (id && id.length === 12 && !id.includes("-")) {
      const query = `
        SELECT id
        FROM projects
        WHERE public_project_id = $1 AND deleted = false;
      `;
      const { executeQuery } = require("@/database/connection");
      const results = await executeQuery(query, [id]);
      
      if (results && results.length > 0) {
        const internalId = results[0].id;
        // In Express, router.param allows modifying req.params by just updating it:
        if (req.params.id === id) req.params.id = internalId;
        if (req.params.projectId === id) req.params.projectId = internalId;
        if (req.params.project_id === id) req.params.project_id = internalId;
      }
    }
    next();
  } catch (error) {
    console.error("[resolveProjectPublicIdParam] Error resolving public ID:", error);
    next();
  }
}

/**
 * Middleware for router.param('noteId') or router.param('id') on notes routes.
 */
async function resolveNotePublicIdParam(req, res, next, id) {
  try {
    if (id && id.length === 12 && !id.includes("-")) {
      const query = `
        SELECT id
        FROM notes
        WHERE public_note_id = $1 AND deleted = false;
      `;
      const { executeQuery } = require("@/database/connection");
      const results = await executeQuery(query, [id]);

      if (results && results.length > 0) {
        const internalId = results[0].id;
        if (req.params.id === id) req.params.id = internalId;
        if (req.params.noteId === id) req.params.noteId = internalId;
      }
    }
    next();
  } catch (error) {
    console.error("[resolveNotePublicIdParam] Error resolving public ID:", error);
    next();
  }
}

async function resolveOrganizationPublicIdParam(req, res, next, id) {
  try {
    if (id && id.length === 12 && !id.includes("-")) {
      const query = `
        SELECT id
        FROM organizations
        WHERE public_id = $1 AND deleted = false;
      `;
      const { executeQuery } = require("@/database/connection");
      const results = await executeQuery(query, [id]);
      
      if (results && results.length > 0) {
        const internalId = results[0].id;
        if (req.params.id === id) req.params.id = internalId;
        if (req.params.orgId === id) req.params.orgId = internalId;
        if (req.params.org_id === id) req.params.org_id = internalId;
      }
    }
    next();
  } catch (error) {
    console.error("[resolveOrganizationPublicIdParam] Error resolving public ID:", error);
    next();
  }
}

module.exports = {
  resolveNotePublicIdParam,
  resolveProjectPublicIdParam,
  resolveOrganizationPublicIdParam,
};
