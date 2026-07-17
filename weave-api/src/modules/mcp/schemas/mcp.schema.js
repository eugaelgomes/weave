const { z } = require("zod");

const listMcpServersSchema = z
  .object({})
  .describe(
    "Schema used for listing all configured external Model Context Protocol (MCP) servers."
  );

const configureMcpServerSchema = z
  .object({
    args: z
      .array(z.string())
      .optional()
      .describe(
        "The array of command line arguments passed to the executable command, optional and used only if transport type is set to stdio."
      ),
    command: z
      .string()
      .optional()
      .describe(
        "The command executable path to launch the Model Context Protocol (MCP) server, required if the transport type is set to stdio."
      ),
    env: z
      .record(z.string())
      .optional()
      .describe(
        "Key-value map of environment variables and configuration settings passed to the Model Context Protocol (MCP) server process."
      ),
    name: z
      .string()
      .min(1, "Name is required")
      .describe(
        "The unique name identifier of the Model Context Protocol (MCP) server configuration."
      ),
    type: z
      .enum(["sse", "stdio"])
      .describe(
        "The transport protocol type used to connect to the Model Context Protocol (MCP) server, which can be either sse or stdio."
      ),
    url: z
      .string()
      .optional()
      .describe(
        "The connection URL of the Model Context Protocol (MCP) server, required if the transport type is set to sse."
      ),
  })
  .describe(
    "Schema for configuring (creating or updating) an external Model Context Protocol (MCP) server configuration."
  );

module.exports = {
  configureMcpServerSchema,
  listMcpServersSchema,
};
