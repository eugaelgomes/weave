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
  name: z.string().optional(),
  username: z.string(),
  email: z.string(),
  avatar_url: z.string().optional(),
  permission: z.enum(["admin", "viewer"]),
  added_at: z.string(),
  removed: z.boolean(),
});

export const ProjectNoteSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.string().optional(),
    project_stage_id: z.string().nullable().optional(),
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
          permission: z.string(),
        })
      )
      .optional(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export const SubProjectSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.string(),
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
    title: z.string(),
    description: z.string().nullable().optional(),
    properties: z.union([z.string(), ProjectPropertiesSchema]).optional(),
    status: projectStatus,
    methodology: z
      .string()
      .transform((v: string) => v.toLowerCase())
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

export const ProjectNotesListSchema = z.object({
  notes: z.array(ProjectNoteSchema),
});

export const ManageNotesResponseSchema = z.object({
  message: z.string(),
  notes: z.array(ProjectNoteSchema).optional(),
});

export const NoteStageUpdateResponseSchema = z.object({
  message: z.string(),
  noteId: z.string(),
  newStageId: z.string(),
});

export const MessageOnlySchema = z.object({
  message: z.string(),
});

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
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const AiReportConfigEnvelopeSchema = z.object({
  config: AiReportConfigSchema.nullable(),
});

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

export const PutAiReportConfigResponseSchema = z
  .object({
    message: z.string().optional(),
    config: z.unknown().optional(),
  })
  .passthrough();

/** DELETE/void-style JSON acknowledgements (may be `{}`). */
export const AckSchema = z.record(z.string(), z.unknown());
