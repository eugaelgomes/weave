import { z } from "zod";

export const getMyProfileSchema = z.object({});

export const searchUsersSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export type GetMyProfileInput = z.infer<typeof getMyProfileSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
