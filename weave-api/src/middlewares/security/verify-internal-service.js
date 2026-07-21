const verifyInternalService = (req, res, next) => {
  const secret = process.env.INTERNAL_SERVICE_SECRET;

  if (!secret) {
    return res.status(503).json({
      code: "INTERNAL_SERVICE_SECRET_NOT_CONFIGURED",
      error: "Service secret is not configured.",
    });
  }

  const providedSecret = req.headers["x-weave-service-secret"];

  if (!providedSecret || providedSecret !== secret) {
    return res.status(403).json({
      code: "INTERNAL_SERVICE_UNAUTHORIZED",
      error: "Unauthorized service request.",
    });
  }

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
