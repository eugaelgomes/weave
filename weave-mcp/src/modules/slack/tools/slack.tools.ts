import { McpToolDefinition } from "../../../types/mcp";
import { AxiosInstance } from "axios";
import {
  setDefaultChannelSchema,
  getSlackStatusSchema,
  disconnectSlackSchema,
  getSlackInstallUrlSchema,
} from "../schemas/slack.schema";
import { z } from "zod";

export const createSlackTools = (apiClient: AxiosInstance): Record<string, McpToolDefinition<any>> => ({
  get_slack_status: {
    name: "get_slack_status",
    description: "Get Slack integration status",
    schema: getSlackStatusSchema,
    handler: async () => {
      try {
        const response = await apiClient.get("/slack/integrations");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  set_slack_default_channel: {
    name: "set_slack_default_channel",
    description: "Set default Slack channel for notifications",
    schema: setDefaultChannelSchema,
    handler: async (args: z.infer<typeof setDefaultChannelSchema>) => {
      try {
        const response = await apiClient.put("/slack/integrations/default-channel", args);
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  disconnect_slack: {
    name: "disconnect_slack",
    description: "Disconnect Slack integration",
    schema: disconnectSlackSchema,
    handler: async () => {
      try {
        const response = await apiClient.delete("/slack/integrations");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
  get_slack_install_url: {
    name: "get_slack_install_url",
    description: "Get URL to install Slack app",
    schema: getSlackInstallUrlSchema,
    handler: async () => {
      try {
        const response = await apiClient.get("/slack/install");
        return { content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }] };
      } catch (error: any) {
        return { isError: true, content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    },
  },
});
