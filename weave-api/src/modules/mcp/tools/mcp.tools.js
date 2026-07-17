const {
  listMcpServersSchema,
  configureMcpServerSchema,
} = require("../schemas/mcp.schema");
const fs = require("fs").promises;
const path = require("path");

const CONFIG_FILE = path.join(__dirname, "../../../config/mcp_servers.json");

async function readMcpConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeMcpConfig(config) {
  await fs.mkdir(path.dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

/**
 * Creates the Mcp tools registry bound to a specific user context.
 *
 * @param {Object} user - The authenticated user object.
 * @returns {Record<string, Object>} The mcp tools definition map.
 */
const createMcpTools = (user) => ({
  configure_mcp_server: {
    description:
      "Configure (add or update) an external Model Context Protocol (MCP) server configuration.",
    handler: async (args) => {
      try {
        const config = await readMcpConfig();
        if (!config[user.id]) {
          config[user.id] = { servers: {} };
        }
        if (!config[user.id].servers) {
          config[user.id].servers = {};
        }

        const serverConfig = {
          args: args.args || null,
          command: args.command || null,
          env: args.env || null,
          name: args.name,
          type: args.type,
          url: args.url || null,
        };

        config[user.id].servers[args.name] = serverConfig;
        await writeMcpConfig(config);

        return {
          content: [
            {
              text: `Successfully configured Model Context Protocol (MCP) server: ${args.name}`,
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error configuring MCP server: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "configure_mcp_server",
    schema: configureMcpServerSchema,
  },
  list_mcp_servers: {
    description:
      "List all configured external Model Context Protocol (MCP) servers for the user.",
    handler: async () => {
      try {
        const config = await readMcpConfig();
        const userConfig = config[user.id] || { servers: {} };
        const servers = Object.values(userConfig.servers || {});

        return {
          content: [
            {
              text: JSON.stringify(servers, null, 2),
              type: "text",
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              text: `Error listing MCP servers: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "list_mcp_servers",
    schema: listMcpServersSchema,
  },
});

module.exports = {
  createMcpTools,
};
