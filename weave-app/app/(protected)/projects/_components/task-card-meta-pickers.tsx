"use client";

import React from "react";

export type ProjectTagOption = {
  id: string;
  name: string;
  color_hex?: string | null;
};

export type ProjectCollaboratorOption = {
  user_id: string;
  username: string;
  name?: string;
};

/**
 * Maps note tag values (id or name) to project tag ids.
 * @param {string[] | undefined} noteTags
 * @param {ProjectTagOption[]} projectTags
 * @returns {Set<string>}
 */
export function normalizeNoteTagIds(
  noteTags: string[] | undefined,
  projectTags: ProjectTagOption[]
): Set<string> {
  const ids = new Set<string>();
  const byId = new Map(projectTags.map((t) => [t.id, t]));
  const byName = new Map(projectTags.map((t) => [t.name.toLowerCase(), t.id]));

  for (const raw of noteTags ?? []) {
    const value = String(raw).trim();
    if (!value) continue;
    if (byId.has(value)) {
      ids.add(value);
      continue;
    }
    const byNameMatch = byName.get(value.toLowerCase());
    if (byNameMatch) ids.add(byNameMatch);
  }
  return ids;
}

/**
 * Selected collaborator user ids from a note.
 * @param {Array<{ user_id?: string; id?: string }>} collaborators
 * @returns {Set<string>}
 */
export function normalizeNoteCollaboratorIds(
  collaborators: Array<{ user_id?: string; id?: string }> | undefined
): Set<string> {
  const ids = new Set<string>();
  for (const c of collaborators ?? []) {
    const id = c.user_id || c.id;
    if (id) ids.add(String(id));
  }
  return ids;
}

type PickerBaseProps = {
  disabled?: boolean;
  saving?: boolean;
};

type TaskCardTagsPickerProps = PickerBaseProps & {
  projectTags: ProjectTagOption[];
  selectedTagIds: Set<string>;
  onToggle: (tagId: string, selected: boolean) => void | Promise<void>;
};

export function TaskCardTagsPicker({
  projectTags,
  selectedTagIds,
  disabled,
  saving,
  onToggle,
}: TaskCardTagsPickerProps) {
  if (projectTags.length === 0) {
    return (
      <p className="text-neutral-500 dark:text-neutral-400">
        Este projeto ainda não tem tags.
      </p>
    );
  }

  return (
    <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
      {projectTags.map((tag) => {
        const selected = selectedTagIds.has(tag.id);
        const color = tag.color_hex || "#737373";
        return (
          <button
            key={tag.id}
            type="button"
            disabled={disabled || saving}
            onClick={() => void onToggle(tag.id, selected)}
            className={`rounded-md border px-2 py-1 text-[11px] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
              selected
                ? "border-brand-primary-500 bg-brand-primary-500/10 text-brand-primary-500"
                : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-surface-dark-border dark:text-neutral-300 dark:hover:border-neutral-600"
            }`}
            style={
              selected
                ? {
                    borderColor: `${color}66`,
                    backgroundColor: `${color}18`,
                    color,
                  }
                : undefined
            }
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}

type TaskCardCollaboratorsPickerProps = PickerBaseProps & {
  projectCollaborators: ProjectCollaboratorOption[];
  selectedUserIds: Set<string>;
  onToggle: (userId: string, selected: boolean) => void | Promise<void>;
};

export function TaskCardCollaboratorsPicker({
  projectCollaborators,
  selectedUserIds,
  disabled,
  saving,
  onToggle,
}: TaskCardCollaboratorsPickerProps) {
  if (projectCollaborators.length === 0) {
    return (
      <p className="text-neutral-500 dark:text-neutral-400">Sem colaboradores no projeto.</p>
    );
  }

  return (
    <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
      {projectCollaborators.map((collaborator) => {
        const selected = selectedUserIds.has(collaborator.user_id);
        const label = collaborator.name || collaborator.username;
        return (
          <button
            key={collaborator.user_id}
            type="button"
            disabled={disabled || saving}
            onClick={() => void onToggle(collaborator.user_id, selected)}
            className={`rounded-md border px-2 py-1 text-[11px] transition-opacity disabled:cursor-not-allowed disabled:opacity-40 ${
              selected
                ? "border-brand-primary-500 bg-brand-primary-500/10 text-brand-primary-500"
                : "border-neutral-200 text-neutral-600 hover:border-neutral-300 dark:border-surface-dark-border dark:text-neutral-300 dark:hover:border-neutral-600"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
