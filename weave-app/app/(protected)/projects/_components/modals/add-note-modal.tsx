import React, { useMemo, useState } from "react";
import { FaTimes, FaSpinner } from "react-icons/fa";
import { FileText, Paperclip, Plus } from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";

interface AddNoteModalProps {
  projectId: string;
  stageId: string | null;
  projectTags: Array<{ id: string; name: string }>;
  projectCollaborators: Array<{ user_id: string; username: string; name?: string }>;
  taskPriorities: Array<{ id: string; name: string; color_hex?: string | null }>;
  onClose: () => void;
  onSuccess: (updatedNotes: any[]) => void;
}

export default function AddNoteModal({
  projectId,
  stageId,
  projectTags,
  projectCollaborators,
  taskPriorities,
  onClose,
  onSuccess,
}: AddNoteModalProps) {
  const { createTaskInStage } = useProjects();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priorityId, setPriorityId] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const disabled = !stageId || !title.trim() || isSaving;
  const stageLabel = useMemo(
    () => (stageId ? `Estágio: ${stageId.slice(0, 8)}...` : "Nenhum estágio selecionado"),
    [stageId]
  );

  const toggleValue = (value: string, values: string[], setter: (next: string[]) => void) => {
    if (values.includes(value)) {
      setter(values.filter((item) => item !== value));
      return;
    }
    setter([...values, value]);
  };

  const handleCreateTask = async () => {
    if (!stageId || !title.trim()) return;
    setIsSaving(true);
    try {
      const updatedNotes = await createTaskInStage(projectId, stageId, {
        title: title.trim(),
        description: description.trim() || undefined,
        tags: selectedTagIds,
        priority_id: priorityId || null,
        collaborator_ids: selectedCollaborators,
        files,
      });
      onSuccess(updatedNotes);
    } catch (error) {
      console.error("Erro ao criar tarefa:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity dark:bg-black/70">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-xl rounded-md border border-neutral-200 bg-white p-5 shadow-2xl dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-xl">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">
            <FileText className="text-brand-primary-500 h-4 w-4" />
            Criar tarefa no estágio
          </h3>
          <button
            onClick={onClose}
            title="Fechar modal"
            aria-label="Fechar modal"
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="space-y-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{stageLabel}</p>

          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título da tarefa"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-primary-500 dark:border-surface-dark-border dark:bg-[#141414] dark:text-neutral-200"
          />

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Descrição (opcional)"
            rows={3}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-primary-500 dark:border-surface-dark-border dark:bg-[#141414] dark:text-neutral-200"
          />

          <select
            value={priorityId}
            onChange={(event) => setPriorityId(event.target.value)}
            aria-label="Selecionar prioridade da tarefa"
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none focus:border-brand-primary-500 dark:border-surface-dark-border dark:bg-[#141414] dark:text-neutral-200"
          >
            <option value="">Sem prioridade</option>
            {taskPriorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.name}
              </option>
            ))}
          </select>

          <div className="rounded-md border border-neutral-200 p-2 dark:border-surface-dark-border">
            <p className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">Tags</p>
            <div className="flex flex-wrap gap-2">
              {projectTags.map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleValue(tag.id, selectedTagIds, setSelectedTagIds)}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    selectedTagIds.includes(tag.id)
                      ? "border-brand-primary-500 bg-brand-primary-500/10 text-brand-primary-500"
                      : "border-neutral-200 text-neutral-500 dark:border-surface-dark-border dark:text-neutral-300"
                  }`}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-neutral-200 p-2 dark:border-surface-dark-border">
            <p className="mb-1 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Colaboradores
            </p>
            <div className="flex flex-wrap gap-2">
              {projectCollaborators.map((collaborator) => (
                <button
                  type="button"
                  key={collaborator.user_id}
                  onClick={() =>
                    toggleValue(
                      collaborator.user_id,
                      selectedCollaborators,
                      setSelectedCollaborators
                    )
                  }
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    selectedCollaborators.includes(collaborator.user_id)
                      ? "border-brand-primary-500 bg-brand-primary-500/10 text-brand-primary-500"
                      : "border-neutral-200 text-neutral-500 dark:border-surface-dark-border dark:text-neutral-300"
                  }`}
                >
                  {collaborator.name || collaborator.username}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-xs text-neutral-500 transition-colors hover:border-brand-primary-500 hover:text-brand-primary-500 dark:border-surface-dark-border dark:text-neutral-300">
            <Paperclip className="h-3.5 w-3.5" />
            <span>{files.length > 0 ? `${files.length} arquivo(s) selecionado(s)` : "Anexar arquivos"}</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500 hover:bg-neutral-100 dark:border-surface-dark-border dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={handleCreateTask}
              className="bg-brand-primary-500 inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-neutral-900 transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <FaSpinner className="h-3 w-3 animate-spin" />
                  Salvando
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  Criar tarefa
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
