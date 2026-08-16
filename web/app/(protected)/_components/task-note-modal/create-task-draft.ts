import type { CreateBlockData } from "@/app/_services/notes-service/notes.schema";

/** Local form state while creating a project task in the modal. */
export type CreateTaskDraft = {
  priorityId: string;
  dueDate: string | null;
  tagIds: string[];
  collaboratorIds: string[];
  pendingFiles: File[];
  color: string;
  blocks: CreateBlockData[];
};

export function emptyCreateTaskDraft(): CreateTaskDraft {
  return {
    priorityId: "",
    dueDate: null,
    tagIds: [],
    collaboratorIds: [],
    pendingFiles: [],
    color: "",
    blocks: [],
  };
}
