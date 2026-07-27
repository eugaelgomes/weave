const { z } = require("zod");
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

const manageMcpSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("configure"),
    args: z.array(z.string()).optional().describe("Arguments for stdio server"),
    command: z.string().optional().describe("Command for stdio server"),
    env: z.record(z.string()).optional().describe("Environment variables"),
    name: z.string().describe("Name of the server"),
    type: z.enum(["stdio", "sse"]).describe("Type of the server"),
    url: z.string().optional().describe("URL for sse server"),
  }),
  z.object({
    action: z.literal("list"),
  }),
]);

const createMcpTools = (user) => ({
  manage_mcp_servers: {
    description:
      "Manage external Model Context Protocol (MCP) servers (configure, list).",
    handler: async (args) => {
      try {
        const { action, name, type, command, env, url } = args;

        if (action === "configure") {
          if (!name || !type)
            throw new Error("name and type are required for configure action.");
          const config = await readMcpConfig();
          if (!config[user.id]) config[user.id] = { servers: {} };
          if (!config[user.id].servers) config[user.id].servers = {};

          const serverConfig = {
            args: args.args || null,
            command: command || null,
            env: env || null,
            name,
            type,
            url: url || null,
          };

          config[user.id].servers[name] = serverConfig;
          await writeMcpConfig(config);

          return {
            content: [
              {
                text: `Successfully configured Model Context Protocol (MCP) server: ${name}`,
                type: "text",
              },
            ],
          };
        }

        if (action === "list") {
          const config = await readMcpConfig();
          const userConfig = config[user.id] || { servers: {} };
          const servers = Object.values(userConfig.servers || {});
          return {
            content: [{ text: JSON.stringify(servers, null, 2), type: "text" }],
          };
        }

        throw new Error(`Invalid action: ${action}`);
      } catch (error) {
        return {
          content: [
            {
              text: `Error managing MCP servers: ${error.message}`,
              type: "text",
            },
          ],
          isError: true,
        };
      }
    },
    name: "manage_mcp_servers",
    schema: manageMcpSchema,
  },
});

module.exports = {
  createMcpTools,
};
