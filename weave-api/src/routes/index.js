const { createInternalRouter } = require("./internal.routes");
const { createPublicRouter } = require("./public.routes");

const DEFAULT_VERSION = "v1";

const buildVersionContext = (version = DEFAULT_VERSION) => ({
  version,
  internalBasePath: `/api/${version}`,
  publicBasePath: `/api/public/${version}`,
});

const registerApiRoutes = (app, { version = DEFAULT_VERSION } = {}) => {
  const context = buildVersionContext(version);
  const internalRouter = createInternalRouter({ version: context.version });
  const publicRouter = createPublicRouter({ version: context.version });

  app.use(context.internalBasePath, internalRouter);
  app.use(context.publicBasePath, publicRouter);

  return context;
};

module.exports = {
  registerApiRoutes,
  buildVersionContext,
};
