const session = require("express-session");
const { pool } = require("@/database/connection");
const { detectSameSitePolicy } = require("@/config/allowed-origins");
const { WeaveSessionStore } = require("./weave-session-store");

const isProduction = process.env.NODE_ENV === "production";

// Resolve session cookie domain: COOKIE_DOMAIN → APP_DOMAIN → undefined
const sessionCookieDomain = isProduction
  ? process.env.COOKIE_DOMAIN ||
    (process.env.APP_DOMAIN ? `.${process.env.APP_DOMAIN}` : undefined)
  : undefined;

const sameSite = isProduction ? detectSameSitePolicy() : "lax";

const sessionCookie = {
  httpOnly: true,
  secure: isProduction ? true : false,
  sameSite,
  maxAge: 1000 * 60 * 60 * 24,
};

if (sessionCookieDomain) {
  sessionCookie.domain = sessionCookieDomain;
}

const sessionConfig = {
  store: new WeaveSessionStore(),
  name: "auth.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: sessionCookie,
};

const sessionMiddleware = session(sessionConfig);

module.exports = { sessionMiddleware };
