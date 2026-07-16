const session = require("express-session");
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
  maxAge: 1000 * 60 * 60 * 24,
  sameSite,
  secure: isProduction ? true : false,
};

if (sessionCookieDomain) {
  sessionCookie.domain = sessionCookieDomain;
}

const sessionConfig = {
  cookie: sessionCookie,
  name: "auth.sid",
  resave: false,
  rolling: true,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET,
  store: new WeaveSessionStore(),
};

const sessionMiddleware = session(sessionConfig);

module.exports = { sessionMiddleware };
