import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * Rate limiter middleware specifically configured for the SSE connection establishment endpoint (`/sse`).
 * Imposes a strict limit to mitigate brute-force and Denial-of-Service (DoS) attacks on connection initialization.
 */
export const sseConnectionLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: 10, // Restrict to a maximum of 10 connection attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many connections from this IP, please try again later.",
});

/**
 * Rate limiter middleware for message transmission via the SSE transport (`/messages`).
 * Designed to accommodate standard operational frequency of tool calls from Large Language Models.
 */
export const messageActionLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX, // Threshold dictated by environment configuration (default: 60)
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many messages from this IP, please try again later.",
});
