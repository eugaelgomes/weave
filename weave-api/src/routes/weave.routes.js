// src/routes/index.js

const DEFAULT_VERSION = "v1";

/**
 * Build version context
 *
 * @param {string} version - API version
 * @returns {object}
 */
const buildVersionContext = (version = DEFAULT_VERSION) => ({
  internalBasePath: `/api/${version}`,
  mcpBasePath: `/api/${version}/mcp`,
  serviceBasePath: `/api/service/${version}`,
  publicBasePath: `/api/public/${version}`,
  version,
});

/**
 * Register api routes dynamically based on the requested version
 *
 * @param {object} app - Express app
 * @param {string} version - API version
 */
const registerApiRoutes = (app, { version = DEFAULT_VERSION } = {}) => {
  const context = buildVersionContext(version);

  const { createInternalRouter } = require(`./${version}/internal.routes`);
  const { createPublicRouter } = require(`./${version}/public.routes`);
  const { createMCPRouter, createServiceMCPRouter } = require(`./${version}/mcp.routes`);

  const internalRouter = createInternalRouter({ version: context.version });
  const publicRouter = createPublicRouter({ version: context.version });

  app.use(context.internalBasePath, internalRouter);
  app.use(context.publicBasePath, publicRouter);
  app.use(context.mcpBasePath, createMCPRouter({ version: context.version }));
  
  const serviceMCPRouter = createServiceMCPRouter();
  app.use(`${context.serviceBasePath}/mcp`, serviceMCPRouter);

  return context;
};

module.exports = {
  buildVersionContext,
  registerApiRoutes,
};
