const { AppError } = require("@/errors/app-error");

/**
 * Factory for a middleware that checks if an API Token has the required scope(s).
 *
 * If the request comes from a Web Session (JWT), `req.user.isApiCall` is falsy,
 * and the middleware will allow the request to proceed (Web RBAC handles access).
 *
 * If the request comes from an API Token (`req.user.isApiCall` is true),
 * it validates if `req.apiToken.scopes` includes ALL the required scopes.
 *
 * @param {string | string[]} requiredScopes - The scope(s) required to access the route.
 */
function requireScope(requiredScopes) {
  return (req, res, next) => {
    // Skip validation for web session requests; Web RBAC handles access.
    if (!req.user || !req.user.isApiCall) {
      return next();
    }

    const tokenScopes = req.apiToken?.scopes || [];

    const scopesToCheck = Array.isArray(requiredScopes)
      ? requiredScopes
      : [requiredScopes];

    const hasAllRequiredScopes = scopesToCheck.every((scope) =>
      tokenScopes.includes(scope)
    );

    if (!hasAllRequiredScopes) {
      return next(
        AppError.forbidden(
          `Access denied. API Token lacks required scope(s): ${scopesToCheck.join(
            ", "
          )}`,
          "INSUFFICIENT_SCOPE"
        )
      );
    }

    return next();
  };
}

module.exports = { requireScope };
