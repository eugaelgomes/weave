import { z } from "zod";

export const ReasoningInstructionSliceSchema = z.object({
  systemAppend: z.string().optional().default(""),
  promptAppend: z.string().optional().default(""),
});

export const ReasoningInstructionsSchema = z.object({
  global: ReasoningInstructionSliceSchema.optional().default({ systemAppend: "", promptAppend: "" }),
  byType: z.record(z.string(), ReasoningInstructionSliceSchema).optional().default({}),
});

export type ReasoningInstructionSlice = z.infer<typeof ReasoningInstructionSliceSchema>;
export type ReasoningInstructions = z.infer<typeof ReasoningInstructionsSchema>;

export function emptyReasoningInstructions(): ReasoningInstructions {
  return { global: { systemAppend: "", promptAppend: "" }, byType: {} };
}

export function parseReasoningInstructions(raw: unknown): ReasoningInstructions {
  const parsed = ReasoningInstructionsSchema.safeParse(raw);
  return parsed.success ? parsed.data : emptyReasoningInstructions();
}
