import { z } from "zod";
import { emailLocalPartContainsPlus } from "@/app/_utils/email-rules";

/** RFC-like email string without `+` in the local part (aligned with API rules). */
export const EmailNoPlusAliasSchema = z
  .string()
  .email()
  .refine((val: string) => !emailLocalPartContainsPlus(val), {
    message: "E-mails com alias (+) no endereço não são permitidos.",
  });

// Zod schema for UserPreferences
export const UserPreferencesSchema = z.object({
  Display: z.object({
  }).passthrough().optional(),
  language: z.object({
    interface: z.string().optional(),
  }).passthrough().optional(),
}).catchall(z.unknown()).optional();

export const PlanDetailsSchema = z.object({
  limits: z.object({
    max_notes: z.number().optional(),
    max_projects: z.number().optional(),
    max_team_members: z.number().optional(),
    exports: z.object({
      notes_monthly: z.number().optional(),
      backups_monthly: z.number().optional(),
    }).optional(),
    storage: z.object({
      retention_days: z.number().nullable().optional(),
      max_file_size_mb: z.number().optional(),
      total_monthly_upload_mb: z.number().optional(),
    }).optional(),
  }).optional(),
  features: z.record(z.string(), z.boolean().optional()).optional(),
  metadata: z.object({
    version: z.string().optional(),
    plan_tier: z.string().optional(),
    is_trial_available: z.boolean().optional(),
  }).optional(),
  weave_ai: z.object({
    enabled: z.boolean().optional(),
    features: z.array(z.string()).optional(),
    config: z.object({
      default_model: z.string().optional(),
      available_models: z.array(z.string()).optional(),
      monthly_messages: z.number().optional(),
      max_tokens_per_message: z.number().optional(),
      context_window_messages: z.number().optional(),
    }).optional(),
  }).optional(),
}).optional();

export const UsageDetailsSchema = z.object({
  monthly_cycle: z.object({
    exports: z.object({
      notes_count: z.number().optional(),
      backups_count: z.number().optional(),
    }).optional(),
    storage: z.object({
      files_count: z.number().optional(),
      total_uploaded_mb: z.number().optional(),
    }).optional(),
    weave_ai: z.object({
      messages_sent: z.number().optional(),
      tokens_estimated: z.number().optional(),
    }).optional(),
    current_period_end: z.string().optional(),
    current_period_start: z.string().optional(),
  }).optional(),
  usage_summary: z.object({
    notes_total: z.number().optional(),
    projects_total: z.number().optional(),
    team_members_total: z.number().optional(),
  }).optional(),
  history_metadata: z.object({
    last_activity_at: z.string().optional(),
    usage_percentage_total: z.number().optional(),
  }).optional(),
}).optional();

/** Matches `mapDefaultAreaInfo` in weave-api `user-data.controller.js` / auth controllers. */
export const BackendOrgDefaultAreaFieldsSchema = z.object({
  id: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  member_since: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const BackendOrgDefaultAreaSchema = BackendOrgDefaultAreaFieldsSchema.nullable().optional();

export type OrgDefaultArea = z.infer<typeof BackendOrgDefaultAreaFieldsSchema>;

export const UserSchema = z.object({
  id: z.string().optional(),
  username: z.string().optional(),
  user_name: z.string().optional(),
  email: z.string().email("Email inválido").optional(),
  avatar_url: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
  birth_date: z.string().optional(),
  phone_number: z.string().optional(),
  public_id: z.string().optional(),


  org_id: z.string().nullable().optional(),
  org_public_id: z.string().nullable().optional(),
  org_name: z.string().nullable().optional(),
  org_unique_name: z.string().nullable().optional(),
  org_logo_url: z.string().nullable().optional(),
  org_member_role: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  logo_url: z.string().nullable().optional(),
  org_member_since: z.string().nullable().optional(),

  theme_mode: z.enum(["LIGHT", "DARK", "light", "dark"]).optional().nullable(),
  private_profile: z.boolean().optional(),
  auth_with_google: z.boolean().optional(),
  auth_with_github: z.boolean().optional(),
  auth_with_microsoft: z.boolean().optional(),

  usage_preference: UserPreferencesSchema,

  plan_id: z.string().optional(),
  plan_name: z.string().optional(),
  plan_client_type: z.string().optional(),
  plan_details: PlanDetailsSchema,

  usage_plan_id: z.string().optional(),
  usage_plan_name: z.string().optional(),
  usage_client_type: z.string().optional(),
  usage_period_start: z.string().optional(),
  usage_period_end: z.string().optional(),
  usage_details: UsageDetailsSchema,

  org_default_area: BackendOrgDefaultAreaFieldsSchema.nullable().optional(),
});

export const BackendProfileSchema = z.object({
  id: z.coerce.string(),
  user_name: z.string(),
  username: z.string(),
  email: z.union([z.string().email(), z.null(), z.literal("")]),
  avatar_url: z.union([z.string(), z.null()]),
  created_at: z.string(),
  updated_at: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  public_id: z.string().optional(),
});


export const BackendSettingsSchema = z.object({
  theme_mode: z.string().nullable().optional(),
  private_profile: z.boolean().nullable().optional(),
  auth_with_google: z.boolean().nullable().optional(),
  auth_with_github: z.boolean().nullable().optional(),
  auth_with_microsoft: z.boolean().nullable().optional(),
  usage_preference: z.record(z.string(), z.unknown()).optional(),
});

export const BackendOrganizationSchema = z.object({
  id: z.string().nullable().optional(),
  unique_name: z.string().nullable().optional(),
  name: z.string().nullable().optional(), // Login response and Me response slightly differ
  org_name: z.string().nullable().optional(), 
  logo_url: z.string().nullable().optional(),
  org_logo_url: z.string().nullable().optional(),
  role: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  member_role: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  org_member_role: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  member_since: z.string().nullable().optional(),
  org_member_since: z.string().nullable().optional(),
  public_id: z.string().nullable().optional(),
});


export const BackendAuthResponseSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
  user: z.object({
    user_profile: z.object({
      id: z.string(),
      name: z.string(),
      username: z.string(),
      email: z.string().email(),
      avatar_url: z.string(),
      public_id: z.string().optional(),
    }),

    user_settings: z.object({
      theme_mode: z.string().optional(),
      private_profile: z.boolean().optional(),
    }),
    user_organization: z
      .object({
        id: z.string().nullable().optional(),
        unique_name: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        role: z.union([z.string(), z.array(z.string())]).nullable().optional(),
        logo_url: z.string().nullable().optional(),
        member_since: z.string().nullable().optional(),
        public_id: z.string().nullable().optional(),
        default_area: BackendOrgDefaultAreaSchema,

      })
      .optional()
      .nullable(),
    user_subscription: z.object({
      plan_id: z.string(),
      plan_name: z.string(),
    }),
  }),
  auth: z.object({
    token: z.string(),
    expires_in: z.number(),
    login_time: z.union([z.string(), z.number()]).optional(),
  }),
});

export const BackendMeResponseSchema = z.object({
  message: z.string().optional(),
  user: z.object({
    user_profile: BackendProfileSchema,
    user_settings: BackendSettingsSchema,
    user_organization: z
      .object({
        id: z.string().nullable().optional(),
        unique_name: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
        logo_url: z.string().nullable().optional(),
        member_role: z.union([z.string(), z.array(z.string())]).nullable().optional(),
        member_since: z.string().nullable().optional(),
        public_id: z.string().nullable().optional(),
        default_area: BackendOrgDefaultAreaSchema,
      })
      .optional()
      .nullable(),
    /** API always sends this object; plan fields may be null for new/OAuth users. */
    current_plan: z
      .object({
        id: z.string().nullable().optional(),
        plan_name: z.string().nullable().optional(),
        client_type: z.string().nullable().optional(),
        details: z.unknown(),
      })
      .optional()
      .nullable(),
    current_plan_usage: z
      .object({
        plan_id: z.string().nullable().optional(),
        plan_name: z.string().nullable().optional(),
        client_type: z.string().nullable().optional(),
        period_start: z.string().nullable().optional(),
        period_end: z.string().nullable().optional(),
        details: z.unknown(),
      })
      .optional()
      .nullable(),
    usage_preference: z.record(z.string(), z.unknown()).nullable().optional(),
  }),
});

// Zod schemas for payload parameters
export const LoginCredentialsSchema = z.object({
  login: z.string().min(1, "Login is required"),
  password: z.string().min(1, "Password is required"),
});

export const CreateUserDataSchema = z.object({
  name: z.string().optional(),
  username: z.string().min(3),
  email: EmailNoPlusAliasSchema,
  password: z.string().min(6),
  user_name: z.string().optional(),
});

export const ActivateAccountPayloadSchema = z.object({
  token: z.string().optional(),
  code: z.string().optional(),
  email: EmailNoPlusAliasSchema.optional(),
});

// Tipos inferidos
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type PlanDetails = z.infer<typeof PlanDetailsSchema>;
export type UsageDetails = z.infer<typeof UsageDetailsSchema>;
export type User = z.infer<typeof UserSchema>;
export type BackendProfile = z.infer<typeof BackendProfileSchema>;
export type BackendSettings = z.infer<typeof BackendSettingsSchema>;
export type BackendOrganization = z.infer<typeof BackendOrganizationSchema>;
export type BackendAuthResponse = z.infer<typeof BackendAuthResponseSchema>;
export type BackendMeResponse = z.infer<typeof BackendMeResponseSchema>;
export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;
export type CreateUserData = z.infer<typeof CreateUserDataSchema>;
export type ActivateAccountPayload = z.infer<typeof ActivateAccountPayloadSchema>;
