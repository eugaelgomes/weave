import { z } from "zod";

const projectStatus = z.enum(["ARCHIVED", "COMPLETED", "IN_PROGRESS", "OPEN", "PAUSED"]);

export const ProjectPropertiesSchema = z
  .object({
    color: z.string().nullable().optional(),
    icon: z
      .union([
        z.string(),
        z.null(),
        z.object({
          name: z.string(),
          path: z.string(),
          type: z.string(),
          size: z.string(),
        }),
      ])
      .optional(),
    tags: z.array(z.string()).optional(),
    priority: z.enum(["alta", "media", "baixa"]).nullable().optional(),
    complexity: z.enum(["alta", "media", "baixa"]).nullable().optional(),
    estimated_time: z.string().nullable().optional(),
    progress: z.number().optional(),
    type: z.union([z.enum(["custom", "continuous_flow", "iterative"]), z.string()]).optional(),
    wip_limit_enabled: z.boolean().optional(),
    lead_time_target_days: z.number().nullable().optional(),
    sprint_duration_weeks: z.number().nullable().optional(),
    estimation_type: z.string().nullable().optional(),
  })
  .passthrough();

export const ProjectStagePropertiesSchema = z.object({
  is_done: z.boolean(),
  wip_limit: z.number().nullable(),
  description: z.string().nullable(),
  auto_assign_to_creator: z.boolean(),
});

export const ProjectStageSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  name: z.string(),
  position: z.number(),
  color: z.string().nullable(),
  properties: z.union([z.string(), ProjectStagePropertiesSchema]),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProjectOwnerSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  name: z.string().optional(),
  avatar_url: z.string().optional(),
});

export const ProjectCollaboratorSchema = z.object({
  user_id: z.string(),
  name: z.string().nullable().optional(),
  username: z.string(),
  email: z.string(),
  avatar_url: z.string().nullable().optional(),
  permission: z.string().optional(),
  added_at: z.string(),
  removed: z.boolean().optional(),
});

export const ProjectNoteSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.string().optional(),
    project_stage_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    created_by: z
      .object({
        user_id: z.string(),
        username: z.string(),
      })
      .optional(),
    collaborators: z
      .array(
        z.object({
          user_id: z.string(),
          username: z.string(),
          permission: z.string().optional(),
          avatar_url: z.string().nullable().optional(),
        })
      )
      .optional(),
    project_id: z.string().nullable().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    priority_id: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    comments_count: z.number().optional(),
    attachments_count: z.number().optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const SubProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.string(),
  public_id: z.string().nullable().optional(),

  properties: z.union([z.string(), ProjectPropertiesSchema]).optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ProjectSchema = z
  .object({
    id: z.string(),
    user_id: z.string(),
    org_id: z.string().nullable().optional(),
    parent_project_id: z.string().nullable().optional(),
    public_id: z.string().nullable().optional(),

    title: z.string(),
    description: z.string().nullable().optional(),
    properties: z.union([z.string(), ProjectPropertiesSchema]).optional(),
    status: projectStatus,
    methodology: z
      .union([z.string(), z.undefined()])
      .transform((v) => (typeof v === "string" && v.length > 0 ? v.toLowerCase() : "kanban"))
      .pipe(z.enum(["scrum", "kanban"])),
    created_at: z.string(),
    updated_at: z.string(),
    deleted: z.boolean(),
    active: z.boolean(),
    owner: ProjectOwnerSchema.optional(),
    collaborators: z.array(ProjectCollaboratorSchema).optional(),
    notes: z.array(ProjectNoteSchema).optional(),
    stages: z.array(ProjectStageSchema).optional(),
    subprojects: z.array(SubProjectSchema).optional(),
    stages_count: z.number().optional(),
    organization: z
      .object({
        id: z.string(),
        name: z.string(),
        unique_name: z.string().nullable().optional(),
        logo_url: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export const ProjectsResponseSchema = z.object({
  projects: z.array(ProjectSchema),
});

export const UpdateProjectEnvelopeSchema = z.object({
  message: z.string(),
  project: ProjectSchema,
});

export const PatchStageEnvelopeSchema = z
  .object({
    message: z.string().optional(),
    stage: ProjectStageSchema,
  })
  .passthrough();

export const ProjectStagesListSchema = z.object({
  stages: z.array(ProjectStageSchema),
});

export const CollaboratorsListSchema = z.object({
  collaborators: z.array(ProjectCollaboratorSchema),
});

export const ManageCollaboratorsResponseSchema = z.object({
  message: z.string(),
  collaborators: z.array(ProjectCollaboratorSchema).optional(),
});

export const ProjectNotesListSchema = z
  .object({
    notes: z.array(ProjectNoteSchema),
    data: z.array(ProjectNoteSchema).optional(),
    pagination: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const ManageNotesResponseSchema = z.object({
  message: z.string(),
  notes: z.array(ProjectNoteSchema).optional(),
});

export const TaskMutationResponseSchema = z.object({
  message: z.string(),
  noteId: z.string().optional(),
  notes: z.array(ProjectNoteSchema),
});

export const NoteStageUpdateResponseSchema = z.object({
  message: z.string(),
  noteId: z.string(),
  newStageId: z.string().nullable().optional(),
  notes: z.array(ProjectNoteSchema).optional(),
});

export const MessageOnlySchema = z.object({
  message: z.string(),
});



export const ProjectViewPreferenceSchema = z.object({
  view: z.enum(["board", "list"]),
});

export const ProjectDashboardStatsSchema = z
  .object({
    overview: z.object({
      total: z.number(),
      owned: z.number(),
      collaborating: z.number(),
      active: z.number(),
      by_status: z.object({
        OPEN: z.number(),
        IN_PROGRESS: z.number(),
        PAUSED: z.number(),
        COMPLETED: z.number(),
        ARCHIVED: z.number(),
      }),
    }),
    methodology: z.object({
      kanban: z.number(),
      scrum: z.number(),
    }),
    progress: z.object({
      average: z.number(),
      near_completion: z.number(),
      not_started: z.number(),
    }),
    notes: z.object({
      total: z.number(),
      VISIBLE: z.number(),
      ARCHIVED: z.number(),
      SECURE: z.number(),
    }),
    tasks: z.object({
      total: z.number(),
      done: z.number(),
      pending: z.number(),
      completion_rate: z.number(),
    }),
    filters_applied: z.object({
      status: z.string().nullable(),
      methodology: z.string().nullable(),
      from: z.string().nullable(),
      to: z.string().nullable(),
      parent_only: z.boolean(),
    }),
  })
  .passthrough();

export const PostCollaboratorResponseSchema = z
  .object({
    message: z.string().optional(),
    collaborators: z.array(z.unknown()).optional(),
  })
  .passthrough();



/** DELETE/void-style JSON acknowledgements (may be `{}`). */
export const AckSchema = z.record(z.string(), z.unknown());
