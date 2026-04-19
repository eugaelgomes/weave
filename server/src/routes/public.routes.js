const express = require("express");
const { verifyToken } = require("@/middlewares/auth/verify-token");

const DEFAULT_VERSION = "v1";

const publicRoutes = [
  {
    method: "get",
    path: "/me",
    middlewares: [verifyToken],
    handler: (req, res) => {
      res.json({
        status: "OK",
        message: "Successfully accessed Weave Notes Public API.",
        user: req.user,
        apiToken: req.apiToken,
      });
    },
  },
];

const createPublicRouter = ({ version = DEFAULT_VERSION } = {}) => {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.apiVersion = version;
    next();
  });

  publicRoutes.forEach(({ method, path, middlewares = [], handler }) => {
    router[method](path, ...middlewares, handler);
  });

  return router;
};

module.exports = { createPublicRouter };
