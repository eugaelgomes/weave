const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { pool } = require("@/services/db/index");

const sessionConfig = {
  store: new pgSession({
    pool,
    tableName: "sessions",
  }),
  name: "auth.sid",
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
      ? (process.env.COOKIE_SAME_SITE || "lax")
      : "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
};

const sessionMiddleware = session(sessionConfig);

module.exports = { sessionMiddleware };
