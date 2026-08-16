/**
 * Internal service middleware for trusted worker routes (e.g. MCP via Engine).
 *
 * Authentication is NOT enforced here — the Engine is a trusted internal worker
 * that only processes jobs already authenticated by the API via the Redis queue.
 * Network-level isolation (Docker/VPC) is the security boundary in production.
 *
 * This middleware only extracts user context from headers set by the Engine.
 */
const verifyInternalService = (req, res, next) => {
  const userId = req.headers["x-weave-user-id"];
  const orgId = req.headers["x-weave-org-id"];

  if (!userId) {
    return res.status(400).json({
      code: "INTERNAL_SERVICE_MISSING_USER",
      error: "User ID is required for this service request.",
    });
  }

  // Populate req.user so that MCP Server can correctly establish context
  req.user = {
    id: userId,
    organizationId: orgId || null,
  };

  next();
};

module.exports = {
  verifyInternalService,
};
