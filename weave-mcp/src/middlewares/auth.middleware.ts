import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/**
 * Middleware to authenticate incoming Express requests using a Bearer token or query parameter.
 * It validates the provided token against the configured MCP_AUTH_TOKEN environment variable.
 * If no token is configured in the environment, authentication is bypassed.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next middleware function.
 * @returns {void}
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Bypass authentication if no master token is configured in the environment
  if (!env.MCP_AUTH_TOKEN) {
    return next();
  }

  let token = req.headers.authorization?.split(" ")[1];

  // Fallback to query parameter for environments/clients lacking header support (e.g., native Web APIs)
  if (!token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized: Token missing" });
    return;
  }

  if (token !== env.MCP_AUTH_TOKEN) {
    res.status(403).json({ error: "Forbidden: Invalid token" });
    return;
  }

  next();
};
