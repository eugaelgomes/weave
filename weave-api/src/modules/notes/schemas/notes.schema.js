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
  limit: z.string().optional(),
  page: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.string().optional(),
  tags: z.string().optional(),
});

// Bodies
const createNoteSchema = z.object({
  blocks: z.union([z.string(), z.array(z.any())]).optional(),
  description: z.string().optional(),
  project_id: z.string().optional().nullable(),
  status: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  title: z.string().optional(),
});

const createCompleteNoteSchema = createNoteSchema.extend({
  initialBlockContent: z.string().optional(),
});

const updateNoteSchema = z.object({
  baseRevision: z.union([z.number(), z.string()]).optional(),
  deleted: z.union([z.boolean(), z.string()]).optional(),
  description: z.string().optional(),
  due_date: z.string().optional().nullable(),
  priority_id: z.string().optional().nullable(),
  project_id: z.string().optional().nullable(),
  properties: z.union([z.string(), z.record(z.any())]).optional(),
  status: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  title: z.string().optional(),
});

const blockAttrsSchema = z.object({
  alt: z.string().optional(),
  backgroundColor: z.string().optional(),
  checked: z.boolean().optional(),
  language: z.string().optional(),
  level: z.number().min(1).max(6).optional(),
  ordered: z.boolean().optional(),
  src: z.string().optional(),
  title: z.string().optional(),
});

const markAttrsSchema = z.object({
  class: z.string().optional(),
  color: z.string().optional(),
  href: z.string().optional(),
  rel: z.string().optional(),
  target: z.string().optional(),
  title: z.string().nullable().optional(),
});

const markSchema = z.object({
  attrs: markAttrsSchema.optional(),
  end: z.number(),
  start: z.number(),
  type: z.enum([
    "bold",
    "code",
    "highlight",
    "italic",
    "link",
    "strike",
    "subscript",
    "superscript",
    "textStyle",
    "underline",
  ]),
});

const blockPropertiesSchema = z
  .object({
    attrs: blockAttrsSchema.optional(),
    level: z.number().optional(),
    marks: z.array(markSchema).optional(),
    text: z.string().optional(),
  })
  .catchall(z.unknown());

// Blocks Bodies
const createNoteBlockSchema = z.object({
  parent_id: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  position: z.number().optional(),
  properties: blockPropertiesSchema.optional(),
  text: z.string().optional(),
  type: z.string().optional(),
});

const updateNoteBlockSchema = z.object({
  expected_version: z.union([z.number(), z.string()]).optional(),
  expectedVersion: z.union([z.number(), z.string()]).optional(),
  position: z.number().optional(),
  properties: blockPropertiesSchema.optional(),
  text: z.string().optional(),
  type: z.string().optional(),
});

const reorderNoteBlocksSchema = z.object({
  ordered_ids: z.array(z.string()).optional(),
  orderedIds: z.array(z.string()).optional(),
  parent_id: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

const putSyncNoteBlocksSchema = z.object({
  base_revision: z.union([z.number(), z.string()]).optional(),
  baseRevision: z.union([z.number(), z.string()]).optional(),
  blocks: z.array(z.any()).min(1, "blocks array is required"),
});

// Comments Bodies
const createCommentSchema = z.object({
  content: z.union([z.string(), z.record(z.any())]).optional(),
  files: z.array(z.any()).optional(),
  parent_id: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
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
  addCollaboratorSchema,
  blockIdParamSchema,
  collaboratorIdParamSchema,
  commentIdParamSchema,
  createCommentSchema,
  createCompleteNoteSchema,
  createNoteBlockSchema,
  createNoteSchema,
  listNotesQuerySchema,
  noteIdParamSchema,
  putSyncNoteBlocksSchema,
  reorderNoteBlocksSchema,
  updateCommentSchema,
  updateNoteBlockSchema,
  updateNoteSchema,
};
