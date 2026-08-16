import { z } from "zod";

// --- Basic Enums & Auxiliaries ---
// NoteStatus depends on your db-enums but we can define it here or import it if needed.
// For schema validation, it's safer to accept strings or strict enums if they are fixed.
// We will use z.string() or an enum if the status list is known. We'll use z.string().
const NoteStatusSchema = z.string();

export const CollaboratorObjectSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  avatar_url: z.string().optional(),
  role: z.string().optional(),
});

export const CollaboratorSchema = z.union([z.string(), CollaboratorObjectSchema]);

// --- Properties ---
export const NotePropertiesSchema = z.object({
  icon: z
    .union([
      z.string(),
      z.object({
        path: z.string(),
        name: z.string(),
        type: z.string(),
      }),
    ])
    .optional(),
  urls: z.array(z.string()).optional(),
  color: z.string().optional(),
  files: z
    .array(
      z
        .object({
          id: z.string().optional(),
          path: z.string().optional(),
          name: z.string().optional(),
          type: z.string().optional(),
        })
        .passthrough()
    )
    .optional(),
  banner: z
    .object({
      path: z.string(),
      name: z.string(),
      type: z.string(),
    })
    .optional(),
  relations: z.array(z.string()).optional(),
  priority: z.string().optional(),
  due_date: z.string().optional(),
});

// --- Tags & Priorities ---
export const TagSchema = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  color: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted: z.boolean(),
  deleted_at: z.string().optional(),
  deleted_by: z.string().optional(),
});

export const TaskPrioritySchema = z.object({
  id: z.string(),
  org_id: z.string(),
  name: z.string(),
  color: z.string(),
  level: z.number(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted: z.boolean(),
  deleted_at: z.string().optional(),
  deleted_by: z.string().optional(),
});

// --- Blocks (API note_blocks + árvore em memória) ---
export const BlockSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.string(),
    text: z.string().nullable().optional(),
    properties: z.record(z.string(), z.unknown()).nullable().optional(),
    done: z.boolean().nullable().optional(),
    parentId: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    position: z.number().nullable().optional(),
    note_id: z.string().nullable().optional(),
    version: z.number().nullable().optional(),
    level: z.number().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
    children: z.array(BlockSchema).nullable().optional(),
  })
);

// --- Users (Search & Collaborators) ---
export const NotesUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  name: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
});

// --- Note Entity ---
export const NoteSchema = z.object({
  id: z.string(),
  public_id: z.string().nullable().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  properties: NotePropertiesSchema.nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  priority_id: z.string().nullable().optional(),
  priority_name: z.string().nullable().optional(),
  priority_color: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  deleted_by: z.string().nullable().optional(),
  deleted: z.boolean().nullable().optional(),
  status: NoteStatusSchema.nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
  revision: z.number().nullable().optional(),
  lastModified: z.string().nullable().optional(),
  preview: z.string().nullable().optional(),
  done: z.boolean().nullable().optional(),
  user_id: z.string().nullable().optional(),
  collaborators: z.array(z.unknown()).nullable().optional(), // Collaborators
  created_by: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  blocks: z.array(BlockSchema).nullable().optional(),
  project_id: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  project_name: z.string().nullable().optional(),

  author: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      username: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      avatar_url: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),

  access: z
    .object({
      isOwner: z.boolean(),
      isCollaborator: z.boolean(),
      canEdit: z.boolean(),
      canDelete: z.boolean(),
      canShare: z.boolean(),
    })
    .nullable()
    .optional(),

  associated_project: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      stage_id: z.string().nullable().optional(),
      stage_name: z.string().nullable().optional(),
      stage_color: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),

  associated_organization: z
    .object({
      id: z.string(),
      name: z.string(),
      unique_name: z.string().nullable().optional(),
      logo_url: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),

  resolved_tags: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string(),
      })
    )
    .optional(),

  // Computed / Unified properties
  owner_name: z.string().nullable().optional(),
  owner_avatar_url: z.string().nullable().optional(),
});

// --- API Responses ---
export const NotesResponseSchema = z.object({
  notes: z.array(NoteSchema),
  pagination: z
    .object({
      currentPage: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasMore: z.boolean(),
    })
    .optional(),
});

export const NotesStatsResponseSchema = z.object({
  totalNotes: z.number(),
  totalTags: z.number(),
  statusDistribution: z.record(z.string(), z.number()),
  mostUsedTags: z.array(
    z.object({
      tag: z.string(),
      count: z.number(),
    })
  ),
});

export const NoteDataResponseSchema = z.object({
  data: NoteSchema.optional(),
});

export const SearchUsersResponseSchema = z.object({
  search_users: z.array(NotesUserSchema).optional(),
  users: z.array(NotesUserSchema).optional(),
  data: z.array(NotesUserSchema).optional(),
});

export const CollaboratorsResponseSchema = z.object({
  collaborators: z.array(NotesUserSchema).optional(),
  data: z.array(NotesUserSchema).optional(),
});

// --- Payloads ---
export const CreateNoteDataSchema = z.object({
  title: z.string().optional().default(""),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  /** Árvore opcional de blocos (API salva em note_blocks) */
  blocks: z.array(z.unknown()).optional(),
});

export const UpdateNoteDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: NoteStatusSchema.optional(),
  project_id: z.string().nullable().optional(),
  priority_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  baseRevision: z.number().int().positive().optional(),
  properties: NotePropertiesSchema.optional(), // Since it's partial in TS, making it optional is enough as properties are optional inside too
  icon: z.any().optional(), // File is hard to validate cleanly without custom logic
  banner: z.any().optional(),
  files: z.array(z.any()).optional(),
});

export const CreateBlockDataSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
  properties: z.record(z.string(), z.unknown()).optional(),
  done: z.boolean().optional(),
  parentId: z.string().optional(),
  position: z.number().optional(),
});

export const ShareNoteDataSchema = z.object({
  userId: z.string(),
});

// --- Inferred Types ---
export type Collaborator = z.infer<typeof CollaboratorSchema>;
export type NoteProperties = z.infer<typeof NotePropertiesSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Note = z.infer<typeof NoteSchema>;
export type NotesResponse = z.infer<typeof NotesResponseSchema>;
export type CreateNoteData = z.infer<typeof CreateNoteDataSchema>;
export type UpdateNoteData = z.infer<typeof UpdateNoteDataSchema>;
export type CreateBlockData = z.infer<typeof CreateBlockDataSchema>;
export type ShareNoteData = z.infer<typeof ShareNoteDataSchema>;
export type NotesUser = z.infer<typeof NotesUserSchema>;
export type NotesStatsResponse = z.infer<typeof NotesStatsResponseSchema>;

export interface FetchNotesParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string | string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
