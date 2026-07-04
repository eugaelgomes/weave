import { z } from "zod";

export const setDefaultChannelSchema = z.object({
  channelId: z.string(),
});

export const getSlackStatusSchema = z.object({});
export const disconnectSlackSchema = z.object({});
export const getSlackInstallUrlSchema = z.object({});
