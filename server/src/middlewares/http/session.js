const session = require("express-session");
const { detectSameSitePolicy } = require("@/config/allowed-origins");
const { WeaveSessionStore } = require("./weave-session-store");

const isProduction = process.env.NODE_ENV === "production";
const IDLE_TIMEOUT_MS = Number(process.env.SESSION_IDLE_TIMEOUT_MS || 30 * 60 * 1000);
const ABSOLUTE_TIMEOUT_MS = Number(process.env.SESSION_ABSOLUTE_TIMEOUT_MS || 8 * 60 * 60 * 1000);
const SESSION_COOKIE_NAME = isProduction ? "__Host-auth.sid" : "auth.sid";

const sameSite = isProduction ? detectSameSitePolicy() : "lax";

const sessionCookie = {
  httpOnly: true,
  maxAge: IDLE_TIMEOUT_MS,
  path: "/",
  sameSite,
  secure: isProduction ? true : false,
};

const sessionStore = new WeaveSessionStore();

const sessionConfig = {
  cookie: sessionCookie,
  name: SESSION_COOKIE_NAME,
  resave: false,
  rolling: true,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
};

const sessionMiddleware = session(sessionConfig);

module.exports = {
  ABSOLUTE_TIMEOUT_MS,
  IDLE_TIMEOUT_MS,
  SESSION_COOKIE_NAME,
  sessionMiddleware,
  sessionStore,
};
