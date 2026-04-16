import React, { useState } from "react";
import { FaTimes, FaSpinner } from "react-icons/fa";
import { FileText, Plus } from "lucide-react";
import { useProjects } from "@/app/_contexts/projects-context";

interface AddNoteModalProps {
  projectId: string;
  existingNotes: any[];
  allUserNotes: any[];
  onClose: () => void;
  onSuccess: (updatedNotes: any[]) => void;
}

export default function AddNoteModal({
  projectId,
  existingNotes,
  allUserNotes,
  onClose,
  onSuccess,
}: AddNoteModalProps) {
  const { addNoteToProject, getProjectNotes } = useProjects();
  const [isAdding, setIsAdding] = useState<string | null>(null);

  // Derivação de estado: Calcula quais notas do utilizador AINDA NÃO estão no projeto
  const availableNotes = allUserNotes.filter(
    (note) => !existingNotes.some((pn) => pn.id === note.id)
  );

  const handleAddNote = async (noteId: string) => {
    setIsAdding(noteId);
    try {
      await addNoteToProject(projectId, noteId);
      const updatedNotes = await getProjectNotes(projectId);
      onSuccess(updatedNotes);
      onClose(); // Fechar após o sucesso
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
      setIsAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity dark:bg-black/70">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">
            <FileText className="text-brand-primary-500 h-4 w-4" />
            Adicionar Nota ao Projeto
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="min-h-[200px]">
          {availableNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 py-10 dark:border-neutral-800">
              <FileText className="mb-2 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
              <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                Nenhuma nota disponível
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Todas as suas notas já foram adicionadas a este projeto.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
                Selecione uma nota para a associar a este projeto e disponibilizá-la no seu Quadro.
              </p>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
                {availableNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleAddNote(note.id)}
                    disabled={isAdding === note.id}
                    className="group dark:hover:bg-brand-primary-500/5 relative flex w-full flex-col gap-1.5 rounded-lg border border-neutral-200 bg-white p-3 text-left transition-all hover:border-yellow-500/50 hover:bg-yellow-50/30 disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-yellow-500/30"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="dark:group-hover:text-brand-primary-500 text-xs font-semibold text-neutral-800 transition-colors group-hover:text-yellow-600 dark:text-neutral-200">
                        {note.title}
                      </p>
                      {isAdding === note.id ? (
                        <FaSpinner className="text-brand-primary-500 h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="group-hover:text-brand-primary-500 h-3.5 w-3.5 text-neutral-400 opacity-0 transition-all group-hover:opacity-100" />
                      )}
                    </div>

                    {note.content && (
                      <p className="line-clamp-2 text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                        {note.content.substring(0, 120)}...
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
