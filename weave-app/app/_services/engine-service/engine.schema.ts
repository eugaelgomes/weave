import { z } from "zod";

export const AiReportConfigSchema = z.object({
  id: z.string().optional(),
  project_id: z.string().optional(),
  enabled: z.boolean(),
  default_sprint_duration_days: z.number(),
  default_workable_days: z.array(z.number()),
  auto_create_next_sprint: z.boolean(),
  enable_sprint_kickoff: z.boolean(),
  enable_daily_standup: z.boolean(),
  enable_sprint_review: z.boolean(),
  report_time_utc: z.string(),
  channels: z.array(z.enum(["in_app", "email"])),
  recipient_scope: z.enum(["owner_only", "all_members", "custom"]),
  custom_recipients: z.unknown().optional(),
  reasoning_instructions: z.unknown().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const AiReportConfigEnvelopeSchema = z.object({
  config: AiReportConfigSchema.nullable(),
});

export const PutAiReportConfigResponseSchema = z
  .object({
    message: z.string().optional(),
    config: z.unknown().optional(),
  })
  .passthrough();

export const SprintSchema = z
  .object({
    id: z.string(),
    project_id: z.string(),
    sprint_number: z.number(),
    title: z.string().optional(),
    goal: z.string().optional(),
    start_date: z.string(),
    end_date: z.string(),
    status: z.enum(["active", "completed", "planned"]),
    completed_at: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    metrics: z.record(z.string(), z.unknown()).nullable().optional(),
    workable_days: z.array(z.number()).optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const SprintsListSchema = z.object({
  sprints: z.array(SprintSchema),
});

export const ActiveSprintEnvelopeSchema = z.object({
  sprint: SprintSchema.nullable(),
});

export const CreateSprintEnvelopeSchema = z.object({
  message: z.string(),
  sprint: SprintSchema,
});

export const CompleteSprintResponseSchema = z.object({
  message: z.string(),
  completed_sprint: SprintSchema,
  next_sprint: SprintSchema.nullable().optional(),
});

export const ReasoningSchema = z
  .object({
    id: z.string(),
    project_id: z.string(),
    sprint_id: z.string().nullable().optional(),
    reasoning_type: z.string().optional(),
    title: z.string(),
    content: z.string().nullable().optional(),
    options: z.record(z.string(), z.unknown()).nullable().optional(),
    is_read: z.boolean().optional(),
    is_dismissed: z.boolean().optional(),
    is_pinned: z.boolean().optional(),
    feedback: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const ReasoningsListSchema = z.object({
  reasonings: z.array(ReasoningSchema),
});

export const ReasoningEnvelopeSchema = z.object({
  reasoning: ReasoningSchema,
});

export const ReasoningActionItemSchema = z.object({
  id: z.string(),
  reasoning_id: z.string(),
  description: z.string().optional(),
  is_completed: z.boolean(),
  assigned_to: z.string().nullable().optional(),
  priority: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ReasoningActionItemsListSchema = z.object({
  actionItems: z.array(ReasoningActionItemSchema),
});

export const ReasoningActionItemEnvelopeSchema = z.object({
  actionItem: ReasoningActionItemSchema,
});

export const InteractionEnvelopeSchema = z.object({
  interaction: z.unknown(),
});

export type AiReportConfig = z.infer<typeof AiReportConfigSchema>;
export type Sprint = z.infer<typeof SprintSchema>;
export type Reasoning = z.infer<typeof ReasoningSchema>;
export type ReasoningActionItem = z.infer<typeof ReasoningActionItemSchema>;

export interface CreateSprintPayload {
  start_date: string;
  end_date: string;
  title?: string;
  goal?: string;
  workable_days?: number[];
  activate?: boolean;
}

export interface CompleteSprintPayload {
  summary?: string;
  metrics?: Record<string, unknown>;
}

export interface CreateReasoningPayload {
  sprintId?: string;
  reasoningType?: string;
  title: string;
  content?: string;
  options?: Record<string, unknown>;
}

export interface UpdateReasoningInteractionPayload {
  isRead?: boolean;
  isDismissed?: boolean;
  isPinned?: boolean;
  feedback?: string;
}

export interface UpdateReasoningActionItemPayload {
  isCompleted?: boolean;
  assignedTo?: string;
  priority?: string;
}
