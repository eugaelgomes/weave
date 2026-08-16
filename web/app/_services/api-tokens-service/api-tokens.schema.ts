import { z } from "zod";

export const ApiTokenSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    key_prefix: z.string(),
    organization_id: z.string().nullable().optional(),
    scopes: z.array(z.string()),
    expires_at: z.string().nullable(),
    revoked_at: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    token: z.string().optional(),
  })
  .passthrough();

export const ApiTokenCreateResponseSchema = z.object({
  message: z.string(),
  token: z.string(),
  record: ApiTokenSchema,
});

export const ApiScopeSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string(),
});

export type ApiToken = z.infer<typeof ApiTokenSchema>;
export type ApiTokenCreateResponse = z.infer<typeof ApiTokenCreateResponseSchema>;
export type ApiScope = z.infer<typeof ApiScopeSchema>;
