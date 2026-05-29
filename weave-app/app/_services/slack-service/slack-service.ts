import { apiClient, API_ENDPOINTS, handleResponse, API_BASE_URL } from "@/app/_services/api-methods";
import { z } from "zod";

export interface SlackStatus {
  connected: boolean;
  default_channel_id: string | null;
  default_channel_name: string | null;
  scopes: string | null;
  slack_team_id: string | null;
  slack_team_name: string | null;
}

export const SlackStatusSchema = z.object({
  connected: z.boolean(),
  default_channel_id: z.string().nullable(),
  default_channel_name: z.string().nullable(),
  scopes: z.string().nullable(),
  slack_team_id: z.string().nullable(),
  slack_team_name: z.string().nullable(),
});

export async function fetchSlackStatus(): Promise<SlackStatus> {
  try {
    const res = await apiClient.get(API_ENDPOINTS.SLACK_STATUS);
    const raw = await handleResponse<unknown>(res);
    return SlackStatusSchema.parse(raw);
  } catch {
    return {
      connected: false,
      default_channel_id: null,
      default_channel_name: null,
      scopes: null,
      slack_team_id: null,
      slack_team_name: null,
    };
  }
}

export function connectSlack() {
  window.location.href = `${API_BASE_URL}${API_ENDPOINTS.SLACK_INSTALL}`;
}

export async function disconnectSlack(): Promise<{ success: boolean; message?: string }> {
  const res = await apiClient.delete(API_ENDPOINTS.SLACK_DISCONNECT);
  await handleResponse<void>(res);
  return { success: true };
}

export async function updateSlackDefaultChannel(
  channelId: string
): Promise<{ default_channel_id: string; default_channel_name: string | null }> {
  const res = await apiClient.put(API_ENDPOINTS.SLACK_STATUS + "/default-channel", {
    channel_id: channelId,
  });
  const data = await handleResponse<unknown>(res);
  return z
    .object({
      default_channel_id: z.string(),
      default_channel_name: z.string().nullable(),
    })
    .parse(data);
}
