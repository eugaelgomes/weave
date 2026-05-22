import React, { useState, useEffect } from "react";
import { FaTimes, FaSearch, FaSpinner, FaUserPlus, FaEye, FaKey } from "react-icons/fa";
import { Users } from "lucide-react";
import Image from "next/image";
import { useNotes } from "@/app/_contexts/notes-context"; // Assumindo que o searchUsers vem daqui
import { useProjects } from "@/app/_contexts/projects-context";
import getStorageUrl from "@/app/_utils/get-storage-url";

interface AddCollaboratorModalProps {
  projectId: string;
  currentCollaborators: any[];
  onClose: () => void;
  onSuccess: (updatedCollabs: any[]) => void;
}

export default function AddCollaboratorModal({
  projectId,
  currentCollaborators,
  onClose,
  onSuccess,
}: AddCollaboratorModalProps) {
  const { searchUsers } = useNotes();
  const { addCollaborator, getCollaborators } = useProjects();

  const [collaboratorSearch, setCollaboratorSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);

  // Pattern: Debounce para evitar sobrecarga na API de pesquisa
  useEffect(() => {
    if (collaboratorSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const results = await searchUsers(collaboratorSearch);
        // Filtra utilizadores que já estão no projeto para não os sugerir novamente
        const filtered = results.filter(
          (u: any) => !currentCollaborators.some((c) => c.user_id === u.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error("Erro ao procurar utilizadores:", error);
      } finally {
        setSearchingUsers(false);
      }
    }, 500); // 500ms de atraso intencional

    return () => clearTimeout(searchTimeout);
  }, [collaboratorSearch, searchUsers, currentCollaborators]);

  const handleAdd = async (userId: string, permission: "admin" | "viewer") => {
    setIsAdding(userId);
    try {
      await addCollaborator(projectId, userId, permission);
      const updatedCollabs = await getCollaborators(projectId);
      onSuccess(updatedCollabs);
      onClose(); // Fecha o modal após o sucesso
    } catch (error) {
      console.error("Erro ao adicionar colaborador:", error);
    } finally {
      setIsAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity dark:bg-black/70">
      {/* Overlay invisível para fechar ao clicar fora */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="dark:shadow-surface-dark-xl dark:border-surface-dark-border relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-2xl dark:bg-[#1d1d1b]">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-800 dark:text-neutral-100">
            <FaUserPlus className="h-4 w-4 text-purple-500" />
            Adicionar Colaborador
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </header>

        <div className="relative mb-4">
          <FaSearch className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={collaboratorSearch}
            onChange={(e) => setCollaboratorSearch(e.target.value)}
            placeholder="Procurar por nome ou email..."
            className="dark:border-surface-dark-border-strong w-full rounded-lg border border-neutral-300 bg-neutral-50 py-2.5 pr-3 pl-9 text-xs text-neutral-900 transition-colors placeholder:text-neutral-400 focus:border-purple-500 focus:outline-none dark:bg-[#1d1d1b] dark:text-neutral-100 dark:placeholder:text-neutral-600"
            autoFocus
          />
        </div>

        {/* Área de Resultados */}
        <div className="min-h-[150px]">
          {searchingUsers ? (
            <div className="flex h-[150px] flex-col items-center justify-center">
              <FaSpinner className="mb-2 h-5 w-5 animate-spin text-purple-500" />
              <p className="text-xs text-neutral-400">A procurar utilizadores...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="dark:shadow-surface-dark-sm dark:border-surface-dark-border flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 p-2.5 transition-all hover:border-neutral-200 hover:shadow-sm dark:bg-[#1d1d1b]/50"
                >
                  <div className="flex items-center gap-2.5">
                    {user.avatar_url ? (
                      <Image
                        src={getStorageUrl(user.avatar_url)}
                        alt={user.name || user.username}
                        className="h-8 w-8 rounded-md object-cover"
                        height={32}
                        width={32}
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/10 text-xs font-bold text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                        {user.name?.charAt(0).toUpperCase() ||
                          user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                        {user.name || user.username}
                      </p>
                      <p className="truncate text-[10px] text-neutral-400">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAdd(user.id, "viewer")}
                      disabled={isAdding === user.id}
                      className="flex items-center gap-1 rounded bg-neutral-200 px-2 py-1 text-[10px] font-semibold text-neutral-600 transition-all hover:bg-neutral-300 disabled:opacity-50 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                    >
                      <FaEye className="h-2.5 w-2.5" /> Leitura
                    </button>
                    <button
                      onClick={() => handleAdd(user.id, "admin")}
                      disabled={isAdding === user.id}
                      className="flex items-center gap-1 rounded bg-purple-100 px-2 py-1 text-[10px] font-semibold text-purple-700 transition-all hover:bg-purple-200 disabled:opacity-50 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30"
                    >
                      <FaKey className="h-2.5 w-2.5" /> Admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : collaboratorSearch.length >= 2 ? (
            <div className="dark:border-surface-dark-border flex h-[150px] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300">
              <Users className="mb-2 h-6 w-6 text-neutral-300 dark:text-neutral-700" />
              <p className="text-xs text-neutral-500">Nenhum utilizador encontrado.</p>
            </div>
          ) : (
            <div className="dark:border-surface-dark-border flex h-[150px] flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300">
              <FaSearch className="mb-2 h-5 w-5 text-neutral-300 dark:text-neutral-700" />
              <p className="text-xs text-neutral-500">
                Digite pelo menos 2 caracteres para procurar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
