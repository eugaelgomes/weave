const { z } = require("zod");

// Params
const noteIdParamSchema = z
  .object({
    id: z.string().min(1).optional(),
    noteId: z.string().min(1).optional(),
  })
  .refine((data) => data.id || data.noteId, {
    message: "Note ID is required",
  });

const blockIdParamSchema = z.object({
  blockId: z.string().uuid("Invalid blockId format"),
});

const commentIdParamSchema = z.object({
  commentId: z.string().uuid("Invalid commentId format"),
});

const collaboratorIdParamSchema = z.object({
  collaboratorId: z.string().min(1, "collaboratorId is required"),
});

// Queries
const listNotesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
});

// Bodies
const createNoteSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.string().optional(),
  project_id: z.string().optional().nullable(),
  blocks: z.union([z.string(), z.array(z.any())]).optional(),
});

const createCompleteNoteSchema = createNoteSchema.extend({
  initialBlockContent: z.string().optional(),
});

const updateNoteSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  status: z.string().optional(),
  deleted: z.union([z.boolean(), z.string()]).optional(),
  project_id: z.string().optional().nullable(),
  properties: z.union([z.string(), z.record(z.any())]).optional(),
  priority_id: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  baseRevision: z.union([z.number(), z.string()]).optional(),
});

// Blocks Bodies
const createNoteBlockSchema = z.object({
  type: z.string().optional(),
  parent_id: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  position: z.number().optional(),
  properties: z.record(z.any()).optional(),
  text: z.string().optional(),
  done: z.boolean().optional(),
});

const updateNoteBlockSchema = z.object({
  expectedVersion: z.union([z.number(), z.string()]).optional(),
  expected_version: z.union([z.number(), z.string()]).optional(),
  type: z.string().optional(),
  position: z.number().optional(),
  properties: z.record(z.any()).optional(),
  text: z.string().optional(),
  done: z.boolean().optional(),
});

const reorderNoteBlocksSchema = z.object({
  parent_id: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  ordered_ids: z.array(z.string()).optional(),
  orderedIds: z.array(z.string()).optional(),
});

const putSyncNoteBlocksSchema = z.object({
  baseRevision: z.union([z.number(), z.string()]).optional(),
  base_revision: z.union([z.number(), z.string()]).optional(),
  blocks: z.array(z.any()).min(1, "blocks array is required"),
});

// Comments Bodies
const createCommentSchema = z.object({
  content: z.union([z.string(), z.record(z.any())]).optional(),
  files: z.array(z.any()).optional(),
  parentId: z.string().uuid().optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

const updateCommentSchema = z.object({
  content: z.union([z.string(), z.record(z.any())]).optional(),
  files: z.array(z.any()).optional(),
});

// Collaborators Bodies
const addCollaboratorSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

module.exports = {
  noteIdParamSchema,
  blockIdParamSchema,
  commentIdParamSchema,
  collaboratorIdParamSchema,
  listNotesQuerySchema,
  createNoteSchema,
  createCompleteNoteSchema,
  updateNoteSchema,
  createNoteBlockSchema,
  updateNoteBlockSchema,
  reorderNoteBlocksSchema,
  putSyncNoteBlocksSchema,
  createCommentSchema,
  updateCommentSchema,
  addCollaboratorSchema,
};
