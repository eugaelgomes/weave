import { z } from "zod";

// --- Base Types for Parameters ---
export const noteIdParamSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
});

export const blockIdParamSchema = z.object({
  blockId: z.string().uuid("Invalid blockId format"),
});

export const collaboratorIdParamSchema = z.object({
  collaboratorId: z.string().min(1, "collaboratorId is required"),
});

// --- Highly Structured Types for Notes and Blocks ---

export const notePropertiesSchema = z.object({
  icon: z.union([z.string(), z.object({ path: z.string(), name: z.string(), type: z.string() })]).optional().describe("Emoji string or image object representing the note icon"),
  color: z.string().optional().describe("Theme color for the note"),
  urls: z.array(z.string()).optional().describe("Associated URLs for this note"),
  relations: z.array(z.string()).optional().describe("IDs of related notes or entities"),
  priority: z.string().optional().describe("Priority ID if any"),
  due_date: z.string().optional().describe("Due date string (e.g. ISO format)")
}).passthrough().describe("Structured metadata properties for the Note");

const blockMarkSchema = z.object({
  start: z.number().describe("Start index of the text where the mark begins"),
  end: z.number().describe("End index of the text where the mark ends"),
  type: z.enum(["bold", "italic", "code", "link", "strike"]).describe("Type of formatting mark"),
  attrs: z.object({
    href: z.string().optional().describe("URL if type is 'link'")
  }).passthrough().optional()
}).describe("Text formatting marks (bold, italic, etc) applied to the block's text");

const blockPropertiesSchema = z.object({
  level: z.number().min(1).max(6).optional().describe("Heading level (1-6), used ONLY if type is 'heading'"),
  language: z.string().optional().describe("Programming language, used ONLY if type is 'code_block' or 'code'"),
  marks: z.array(blockMarkSchema).optional().describe("Formatting marks applied to the text"),
  attrs: z.object({
    checked: z.boolean().optional().describe("Whether a todo block is checked"),
    ordered: z.boolean().optional().describe("Whether a list block is ordered (numbered)")
  }).passthrough().optional()
}).passthrough().describe("Specific structured properties for the block type");

export const blockSchema: z.ZodType<any> = z.lazy(() => z.object({
  type: z.enum([
    "paragraph", "heading", "todo", "list", "blockquote", "quote",
    "code_block", "code", "divider", "image", "video", "table"
  ]).describe("The semantic type of the block"),
  text: z.string().optional().describe("The text content of the block"),
  properties: blockPropertiesSchema.optional(),
  done: z.boolean().optional().describe("For todo blocks: whether it is completed"),
  parentId: z.string().uuid().optional().describe("UUID of the parent block, if nested"),
  position: z.number().optional().describe("Position/order of this block among its siblings"),
  children: z.array(blockSchema).optional().describe("Nested child blocks (e.g. for nested lists)")
}).describe("A structured content block forming the note's body"));

// --- Queries ---
export const listNotesSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

// --- Bodies ---
export const createNoteToolSchema = z.object({
  title: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.string().optional(),
  project_id: z.string().optional().nullable(),
  blocks: z.array(blockSchema).optional().describe("Structured array of blocks representing the note content")
});

export const createCompleteNoteSchema = createNoteToolSchema.extend({
  initialBlockContent: z.string().optional(),
});

export const updateNoteSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.string().optional(),
  deleted: z.union([z.boolean(), z.string()]).optional(),
  project_id: z.string().optional().nullable(),
  properties: notePropertiesSchema.optional(),
  priority_id: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  baseRevision: z.union([z.number(), z.string()]).optional(),
});

export const deleteNoteSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
});

export const getNoteSchema = noteIdParamSchema;
export const getNotesStatsSchema = z.object({});
export const getNoteResourceSchema = noteIdParamSchema;

// --- Blocks Bodies ---
export const listNoteBlocksSchema = noteIdParamSchema;

export const createNoteBlockSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  type: z.enum([
    "paragraph", "heading", "todo", "list", "blockquote", "quote",
    "code_block", "code", "divider", "image", "video", "table"
  ]).describe("The semantic type of the block"),
  parent_id: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  position: z.number().optional(),
  properties: blockPropertiesSchema.optional(),
  text: z.string().optional(),
  done: z.boolean().optional(),
});

export const updateNoteBlockSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  blockId: z.string().uuid("Invalid blockId format"),
  expectedVersion: z.union([z.number(), z.string()]).optional(),
  expected_version: z.union([z.number(), z.string()]).optional(),
  type: z.enum([
    "paragraph", "heading", "todo", "list", "blockquote", "quote",
    "code_block", "code", "divider", "image", "video", "table"
  ]).optional(),
  position: z.number().optional(),
  properties: blockPropertiesSchema.optional(),
  text: z.string().optional(),
  done: z.boolean().optional(),
});

export const deleteNoteBlockSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  blockId: z.string().uuid("Invalid blockId format"),
});

export const reorderNoteBlocksSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  parent_id: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  ordered_ids: z.array(z.string()).optional(),
  orderedIds: z.array(z.string()).optional(),
});

export const putSyncNoteBlocksSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  baseRevision: z.union([z.number(), z.string()]).optional(),
  base_revision: z.union([z.number(), z.string()]).optional(),
  blocks: z.array(blockSchema).min(1, "blocks array is required"),
});

// --- Collaborators ---
export const getNoteCollaboratorsSchema = noteIdParamSchema;

export const addNoteCollaboratorSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  userId: z.string().min(1, "userId is required"),
});

export const removeNoteCollaboratorSchema = z.object({
  noteId: z.string().uuid("Invalid note ID format"),
  collaboratorId: z.string().min(1, "collaboratorId is required"),
});

// --- Types ---
export type ListNotesInput = z.infer<typeof listNotesSchema>;
export type GetNoteInput = z.infer<typeof getNoteSchema>;
export type CreateNoteToolInput = z.infer<typeof createNoteToolSchema>;
export type CreateCompleteNoteInput = z.infer<typeof createCompleteNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type DeleteNoteInput = z.infer<typeof deleteNoteSchema>;
export type GetNotesStatsInput = z.infer<typeof getNotesStatsSchema>;

export type ListNoteBlocksInput = z.infer<typeof listNoteBlocksSchema>;
export type CreateNoteBlockInput = z.infer<typeof createNoteBlockSchema>;
export type UpdateNoteBlockInput = z.infer<typeof updateNoteBlockSchema>;
export type DeleteNoteBlockInput = z.infer<typeof deleteNoteBlockSchema>;
export type ReorderNoteBlocksInput = z.infer<typeof reorderNoteBlocksSchema>;
export type PutSyncNoteBlocksInput = z.infer<typeof putSyncNoteBlocksSchema>;

export type GetNoteCollaboratorsInput = z.infer<typeof getNoteCollaboratorsSchema>;
export type AddNoteCollaboratorInput = z.infer<typeof addNoteCollaboratorSchema>;
export type RemoveNoteCollaboratorInput = z.infer<typeof removeNoteCollaboratorSchema>;
