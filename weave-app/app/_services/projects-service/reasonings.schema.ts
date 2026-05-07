import { z } from "zod";

export const ReasoningInteractionSchema = z
  .object({
    is_read: z.boolean().nullable().optional(),
    is_pinned: z.boolean().nullable().optional(),
    is_dismissed: z.boolean().nullable().optional(),
    feedback: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const ReasoningLeanSchema = z
  .object({
    id: z.string(),
    reasoning_type: z.string(),
    title: z.string(),
    status: z.string().nullable().optional(),
    safety_label: z.string().nullable().optional(),
    safety_blocked: z.boolean().nullable().optional(),
    provider_used: z.string().nullable().optional(),
    model_used: z.string().nullable().optional(),
    action_items_count: z.number().nullable().optional(),
    processing_time_ms: z.number().nullable().optional(),
    recipient_scope: z.string().nullable().optional(),
    expires_at: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),

    // Joined interaction fields
    is_read: z.boolean().nullable().optional(),
    is_pinned: z.boolean().nullable().optional(),
    is_dismissed: z.boolean().nullable().optional(),
    feedback: z.string().nullable().optional(),

    // Joined sprint fields (optional)
    sprint_number: z.number().nullable().optional(),
    sprint_title: z.string().nullable().optional(),
  })
  .passthrough();

export const ReasoningsListEnvelopeSchema = z.object({
  reasonings: z.array(ReasoningLeanSchema),
});

export const ReasoningContentSchema = z
  .object({
    reasoning_id: z.string(),
    output_markdown: z.string().nullable().optional(),
    output_raw: z.unknown().nullable().optional(),
    output_metadata: z.unknown().nullable().optional(),
    input_context: z.unknown().nullable().optional(),
    input_prompt: z.string().nullable().optional(),
    input_system_message: z.string().nullable().optional(),

    title: z.string().nullable().optional(),
    reasoning_type: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    safety_label: z.string().nullable().optional(),
    reasoning_created_at: z.string().nullable().optional(),
  })
  .passthrough();

export const ReasoningContentEnvelopeSchema = z.object({
  reasoning: ReasoningContentSchema,
});

export const ReasoningActionItemSchema = z
  .object({
    id: z.string(),
    reasoning_id: z.string(),
    note_id: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    content: z.string(),
    priority: z.string().nullable().optional(),
    assigned_to: z.string().nullable().optional(),
    assigned_to_name: z.string().nullable().optional(),
    assigned_to_avatar: z.string().nullable().optional(),
    is_completed: z.boolean().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    completed_by: z.string().nullable().optional(),
    completed_by_name: z.string().nullable().optional(),
  })
  .passthrough();

export const ReasoningActionItemsEnvelopeSchema = z.object({
  actionItems: z.array(ReasoningActionItemSchema),
});

export const ReasoningInteractionEnvelopeSchema = z.object({
  interaction: z.unknown().nullable(),
});

export const ReasoningActionItemEnvelopeSchema = z.object({
  actionItem: z.unknown().nullable(),
});

export const ReasoningCreateEnvelopeSchema = z.object({
  reasoning: z.unknown(),
});

export type ReasoningLean = z.infer<typeof ReasoningLeanSchema>;
export type ReasoningContent = z.infer<typeof ReasoningContentSchema>;
export type ReasoningActionItem = z.infer<typeof ReasoningActionItemSchema>;

