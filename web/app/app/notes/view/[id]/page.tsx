"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  FaArrowLeft,
  FaTrash,
  FaTag,
  FaSpinner,
  FaShare,
  FaPlus,
  FaTimes,
  FaUserPlus,
  FaSearch,
  FaCode,
  FaQuoteLeft,
  FaListUl,
  FaCheckSquare,
  FaHeading,
  FaParagraph,
  FaGripVertical,
} from "react-icons/fa";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
// CSS transform utility handled manually
import { useNotes } from "@/app/contexts/NotesContext";
import { Note, Block, User as SearchUser } from "@/app/services/notes-service/NotesService";
import {
  getCollaboratorDisplayName,
  getCollaboratorAvatarUrl,
  getCollaboratorId,
} from "@/app/utils/collaborators";

// =================== COMPONENTE DE BLOCO SORTABLE ===================
interface BlockComponentProps {
  block: Block & { children?: Block[] };
  noteId: string;
  onUpdate: (blockId: string, data: Partial<Block>) => Promise<void>;
  onDelete: (blockId: string) => Promise<void>;
  onAddBlock: (parentId?: string) => void;
  isDragging?: boolean;
}

const SortableBlockComponent: React.FC<BlockComponentProps> = ({
  block,
  noteId,
  onUpdate,
  onDelete,
  onAddBlock,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const transformStyle = transform
    ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
    : undefined;

  return (
    <div
      ref={setNodeRef}
      className={`transition-transform ${isDragging ? "opacity-50" : "opacity-100"}`}
      // Inline styles são necessários para o dnd-kit funcionar
      style={{
        transform: transformStyle,
        transition,
      }}
    >
      <BlockComponent
        block={block}
        noteId={noteId}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onAddBlock={onAddBlock}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

// =================== COMPONENTE DE BLOCO ===================
interface BlockInnerProps {
  block: Block & { children?: Block[] };
  noteId: string;
  onUpdate: (blockId: string, data: Partial<Block>) => Promise<void>;
  onDelete: (blockId: string) => Promise<void>;
  onAddBlock: (parentId?: string) => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const BlockComponent: React.FC<BlockInnerProps> = ({
  block,
  noteId,
  onUpdate,
  onDelete,
  onAddBlock,
  isDragging,
  dragHandleProps,
}) => {
  const [localText, setLocalText] = useState(block.text || "");
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (block.text !== localText) {
      setLocalText(block.text || "");
    }
  }, [block.text, localText]);

  const handleBlur = () => {
    if (localText !== block.text) {
      onUpdate(block.id, { text: localText });
    }
  };

  // Auto-save com debounce
  useEffect(() => {
    if (localText === block.text) return;

    const timeoutId = setTimeout(() => {
      onUpdate(block.id, { text: localText });
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [localText, block.id, block.text, onUpdate]);

  const handleToggleDone = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (block.type === "todo") {
      await onUpdate(block.id, { done: !block.done });
    }
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case "heading":
        return (
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            className="w-full bg-transparent text-xl font-bold text-neutral-100 placeholder-neutral-500 outline-none"
            placeholder="Título..."
          />
        );

      case "todo":
        return (
          <div className="flex items-start gap-3">
            <button
              onClick={handleToggleDone}
              className={`mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-colors ${
                block.done
                  ? "border-yellow-500 bg-yellow-500 text-neutral-950"
                  : "border-neutral-600 hover:border-yellow-500"
              }`}
            >
              {block.done && <FaCheckSquare size={10} />}
            </button>
            <input
              type="text"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={handleBlur}
              className={`w-full bg-transparent text-neutral-200 placeholder-neutral-500 outline-none ${
                block.done ? "text-neutral-500 line-through" : ""
              }`}
              placeholder="Tarefa..."
            />
          </div>
        );

      case "list":
        return (
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-yellow-500" />
            <input
              type="text"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={handleBlur}
              className="w-full bg-transparent text-neutral-200 placeholder-neutral-500 outline-none"
              placeholder="Item da lista..."
            />
          </div>
        );

      case "quote":
        return (
          <div className="border-l-4 border-yellow-500 pl-4">
            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={handleBlur}
              className="w-full resize-none bg-transparent text-neutral-300 italic placeholder-neutral-500 outline-none"
              placeholder="Citação..."
              rows={2}
            />
          </div>
        );

      case "code":
        return (
          <div className="overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-700 bg-neutral-800 px-3 py-2">
              <span className="text-xs text-neutral-400">
                {(block.properties as { language?: string })?.language || "código"}
              </span>
              <FaCode size={12} className="text-neutral-500" />
            </div>
            <textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={handleBlur}
              className="w-full resize-none bg-neutral-900 p-3 font-mono text-sm text-green-400 placeholder-neutral-600 outline-none"
              placeholder="// Seu código aqui..."
              rows={5}
            />
          </div>
        );

      case "paragraph":
      case "text":
      default:
        return (
          <textarea
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            className="w-full resize-none bg-transparent leading-relaxed text-neutral-200 placeholder-neutral-500 outline-none"
            placeholder="Digite seu texto..."
            rows={Math.max(2, localText.split("\n").length)}
          />
        );
    }
  };

  return (
    <div
      className={`group relative ${isDragging ? "z-50" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Handle de arrastar */}
      <div
        className={`absolute top-1 -left-8 flex flex-col gap-1 transition-opacity ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <button
          {...dragHandleProps}
          className="cursor-grab rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-yellow-500 active:cursor-grabbing"
          title="Arrastar para reordenar"
        >
          <FaGripVertical size={12} />
        </button>
      </div>

      {/* Conteúdo do bloco */}
      <div
        className={`rounded-md px-2 py-1 transition-colors hover:bg-neutral-900/50 ${
          isDragging ? "bg-neutral-800 shadow-lg ring-2 ring-yellow-500/50" : ""
        }`}
      >
        {renderBlockContent()}
      </div>

      {/* Botão de deletar */}
      {isHovered && (
        <button
          onClick={() => onDelete(block.id)}
          className="absolute top-1 -right-2 rounded p-1 text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
          title="Remover bloco"
        >
          <FaTimes size={12} />
        </button>
      )}

      {/* Blocos filhos (recursivo) */}
      {block.children && block.children.length > 0 && (
        <div className="mt-2 ml-6 border-l-2 border-neutral-800 pl-4">
          {block.children.map((child) => (
            <BlockComponent
              key={child.id}
              block={child}
              noteId={noteId}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddBlock={onAddBlock}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =================== SKELETON SIMPLES ===================
const NoteDetailSkeleton = () => (
  <div className="min-h-screen bg-neutral-950">
    <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="h-6 w-6 animate-pulse rounded bg-neutral-700" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-700" />
          <div className="h-6 w-6 animate-pulse rounded bg-neutral-700" />
        </div>
      </div>
    </div>

    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6">
        <div className="mb-3 h-8 w-1/2 animate-pulse rounded bg-neutral-700" />
      </div>
      <div className="space-y-3">
        <div className="h-5 w-4/5 animate-pulse rounded bg-neutral-700" />
        <div className="h-4 w-full animate-pulse rounded bg-neutral-700" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-700" />
        <div className="h-12 w-full animate-pulse rounded-md bg-neutral-800" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-700" />
        <div className="h-24 w-full animate-pulse rounded-md bg-neutral-800" />
      </div>
    </div>
  </div>
);

// =================== SELETOR DE TIPO DE BLOCO ===================
interface BlockTypeSelectorProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

const BlockTypeSelector: React.FC<BlockTypeSelectorProps> = ({ onSelect, onClose }) => {
  const blockOptions = [
    { type: "paragraph", label: "Parágrafo", icon: FaParagraph, description: "Texto simples" },
    { type: "heading", label: "Título", icon: FaHeading, description: "Título de seção" },
    { type: "todo", label: "Tarefa", icon: FaCheckSquare, description: "Item de checklist" },
    { type: "list", label: "Lista", icon: FaListUl, description: "Item de lista" },
    { type: "quote", label: "Citação", icon: FaQuoteLeft, description: "Bloco de citação" },
    { type: "code", label: "Código", icon: FaCode, description: "Bloco de código" },
  ];

  return (
    <div className="absolute left-0 z-20 mt-2 w-64 rounded-lg border border-neutral-700 bg-neutral-900 p-2 shadow-xl">
      <div className="mb-2 border-b border-neutral-700 px-2 pb-2 text-xs font-semibold text-neutral-400">
        Tipo de bloco
      </div>
      {blockOptions.map((option) => (
        <button
          key={option.type}
          onClick={() => {
            onSelect(option.type);
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-neutral-800"
        >
          <option.icon className="text-yellow-500" size={14} />
          <div>
            <div className="text-sm font-medium text-neutral-200">{option.label}</div>
            <div className="text-xs text-neutral-500">{option.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

const NoteDetail = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // Hook para gerenciar notas
  const {
    loading: isLoading,
    error,
    getNoteById,
    updateNote,
    deleteNote,
    shareNote,
    searchUsers,
    removeCollaborator,
    createBlock,
    updateBlock: updateBlockService,
    deleteBlock: deleteBlockService,
    reorderBlocks: reorderBlocksService,
  } = useNotes();

  const [note, setNote] = useState<Note | null>(null);
  const [blocks, setBlocks] = useState<(Block & { children?: Block[] })[]>([]);
  const [editingTitle, setEditingTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Estados para modais e funcionalidades
  const [showShareModal, setShowShareModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showBlockTypeSelector, setShowBlockTypeSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Configuração dos sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Precisa arrastar 8px para ativar
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Carregar nota específica
  useEffect(() => {
    if (id) {
      const loadNote = async () => {
        const loadedNote = await getNoteById(id);
        if (loadedNote) {
          setNote(loadedNote);
          setEditingTitle(loadedNote.title);
          // Carregar blocos da nota
          if (loadedNote.blocks) {
            setBlocks(loadedNote.blocks as (Block & { children?: Block[] })[]);
          }
        }
      };
      loadNote();
    }
  }, [id, getNoteById]);

  // Auto-salvar título quando houver mudanças
  useEffect(() => {
    if (!note) return;

    const hasChanges = editingTitle !== note.title;
    if (!hasChanges) return;

    const timeoutId = setTimeout(async () => {
      setIsSaving(true);
      try {
        const updatedNote = await updateNote(note.id, {
          title: editingTitle,
        });

        if (updatedNote) {
          setNote((prev) => (prev ? { ...prev, title: editingTitle } : null));
        }
      } catch (error) {
        console.error("Erro ao salvar:", error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [editingTitle, note, updateNote]);

  // =================== FUNÇÕES PARA DRAG AND DROP ===================
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !note) return;

    const oldIndex = blocks.findIndex((block) => block.id === active.id);
    const newIndex = blocks.findIndex((block) => block.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // Atualizar estado local imediatamente para feedback visual
    const newBlocks = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(newBlocks);

    // Preparar as novas posições para o backend
    const blockPositions = newBlocks.map((block, index) => ({
      id: block.id,
      position: index,
    }));

    // Salvar no backend
    try {
      setIsSaving(true);
      await reorderBlocksService(note.id, blockPositions);
    } catch (error) {
      console.error("Erro ao reordenar blocos:", error);
      // Reverter em caso de erro
      const revertedBlocks = arrayMove(newBlocks, newIndex, oldIndex);
      setBlocks(revertedBlocks);
      alert("Erro ao reordenar blocos. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  // Encontrar bloco ativo para o DragOverlay
  const activeBlock = activeId ? blocks.find((block) => block.id === activeId) : null;

  // =================== FUNÇÕES PARA BLOCOS ===================
  const handleUpdateBlock = async (blockId: string, data: Partial<Block>) => {
    if (!note) return;

    try {
      setIsSaving(true);
      await updateBlockService(note.id, blockId, data);

      // Atualizar estado local
      setBlocks((prevBlocks) => {
        const updateBlockRecursive = (
          blockList: (Block & { children?: Block[] })[]
        ): (Block & { children?: Block[] })[] => {
          return blockList.map((block) => {
            if (block.id === blockId) {
              return { ...block, ...data };
            }
            if (block.children && block.children.length > 0) {
              return {
                ...block,
                children: updateBlockRecursive(
                  block.children as (Block & { children?: Block[] })[]
                ),
              };
            }
            return block;
          });
        };
        return updateBlockRecursive(prevBlocks);
      });
    } catch (error) {
      console.error("Erro ao atualizar bloco:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!note) return;

    if (!window.confirm("Tem certeza que deseja remover este bloco?")) return;

    try {
      await deleteBlockService(note.id, blockId);

      // Remover do estado local
      setBlocks((prevBlocks) => {
        const removeBlockRecursive = (
          blockList: (Block & { children?: Block[] })[]
        ): (Block & { children?: Block[] })[] => {
          return blockList
            .filter((block) => block.id !== blockId)
            .map((block) => {
              if (block.children && block.children.length > 0) {
                return {
                  ...block,
                  children: removeBlockRecursive(
                    block.children as (Block & { children?: Block[] })[]
                  ),
                };
              }
              return block;
            });
        };
        return removeBlockRecursive(prevBlocks);
      });
    } catch (error) {
      console.error("Erro ao deletar bloco:", error);
      alert("Erro ao remover bloco. Tente novamente.");
    }
  };

  const handleAddBlock = async (type: string, parentId?: string) => {
    if (!note) return;

    try {
      const newBlock = await createBlock(note.id, {
        type,
        text: "",
        parentId,
        position: blocks.length,
      });

      if (newBlock) {
        setBlocks((prev) => [...prev, { ...newBlock, children: [] }]);
        setShowBlockTypeSelector(false);
      }
    } catch (error) {
      console.error("Erro ao criar bloco:", error);
      alert("Erro ao criar bloco. Tente novamente.");
    }
  };

  const handleDelete = async () => {
    if (!note) return;

    if (window.confirm("Tem certeza que deseja deletar esta nota?")) {
      try {
        const success = await deleteNote(note.id);
        if (success) {
          router.push("/app/notes");
        }
      } catch (error) {
        console.error("Erro ao deletar nota:", error);
        alert("Erro ao deletar a nota. Tente novamente.");
      }
    }
  };

  const handleBack = () => {
    router.push("/app/notes");
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("pt-BR", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Data inválida";
    }
  };

  // =================== FUNÇÕES PARA COLABORAÇÃO ===================
  const handleSearchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const users = await searchUsers(term);
      setSearchResults(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleShareNote = async (userId: string) => {
    if (!note) return;

    try {
      await shareNote(note.id, {
        userId: userId,
      });

      const updatedNote = await getNoteById(note.id);
      if (updatedNote) {
        setNote(updatedNote);
      }

      setShowShareModal(false);
      setSearchTerm("");
      setSearchResults([]);
    } catch (error) {
      console.error("Erro ao compartilhar nota:", error);
      alert("Erro ao compartilhar nota. Tente novamente.");
    }
  };

  const handleRemoveCollaborator = async (collaborator: unknown) => {
    if (!note) return;

    const collaboratorId = getCollaboratorId(collaborator);
    const collaboratorName = getCollaboratorDisplayName(collaborator);

    if (!collaboratorId) {
      alert("ID do colaborador não encontrado.");
      return;
    }

    if (window.confirm(`Tem certeza que deseja remover ${collaboratorName} desta nota?`)) {
      try {
        const success = await removeCollaborator(note.id, collaboratorId);

        if (success) {
          const updatedNote = await getNoteById(note.id);
          if (updatedNote) {
            setNote(updatedNote);
          }
        }
      } catch (error) {
        console.error("Erro ao remover colaborador:", error);
        alert("Erro ao remover colaborador. Tente novamente.");
      }
    }
  };

  // =================== FUNÇÕES PARA TAGS ===================
  const handleAddTag = async () => {
    if (!note || !newTag.trim()) return;

    const currentTags = note.tags || [];
    if (currentTags.includes(newTag.trim())) {
      alert("Esta tag já existe nesta nota.");
      return;
    }

    try {
      const updatedTags = [...currentTags, newTag.trim()];
      const updatedNote = await updateNote(note.id, {
        tags: updatedTags,
      });

      if (updatedNote) {
        setNote((prev) => (prev ? { ...prev, tags: updatedTags } : null));
        setNewTag("");
        setShowTagModal(false);
      }
    } catch (error) {
      console.error("Erro ao adicionar tag:", error);
      alert("Erro ao adicionar tag. Tente novamente.");
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!note) return;

    try {
      const updatedTags = (note.tags || []).filter((tag) => tag !== tagToRemove);
      const updatedNote = await updateNote(note.id, {
        tags: updatedTags,
      });

      if (updatedNote) {
        setNote((prev) => (prev ? { ...prev, tags: updatedTags } : null));
      }
    } catch (error) {
      console.error("Erro ao remover tag:", error);
      alert("Erro ao remover tag. Tente novamente.");
    }
  };

  // Adicionar listener para teclas de atalho
  useEffect(() => {
    const handleDocumentKeyDown = async (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (note) {
          setIsSaving(true);
          try {
            await updateNote(note.id, {
              title: editingTitle,
            });
          } catch (error) {
            console.error("Erro ao salvar:", error);
          } finally {
            setIsSaving(false);
          }
        }
      }
    };

    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, editingTitle]);

  if (isLoading || !note) {
    return <NoteDetailSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
        <div className="max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-6 text-center shadow-sm">
          <div className="mb-4 text-lg text-neutral-300">⚠️ {error}</div>
          <button
            onClick={handleBack}
            className="mx-auto flex items-center gap-2 rounded-md bg-neutral-700 px-4 py-2 text-white transition-colors hover:bg-neutral-600"
          >
            <FaArrowLeft size={14} />
            Voltar para Notas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-lg">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-900 px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <button
            onClick={handleBack}
            className="rounded-md p-2 text-neutral-300 transition-all hover:bg-neutral-800 hover:text-yellow-500"
            title="Voltar para lista de notas"
          >
            <FaArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-3 text-sm text-neutral-400">
            {note.updated_at && <span>Atualizada {formatDate(note.updated_at)}</span>}
            <div className="flex items-center gap-1">
              {note.access?.canEdit && (
                <button
                  onClick={() => setShowTagModal(true)}
                  className="rounded-md p-2 text-neutral-400 transition-all hover:bg-neutral-800 hover:text-yellow-500"
                  title="Gerenciar tags"
                >
                  <FaTag size={14} />
                </button>
              )}

              {note.access?.canShare && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className="rounded-md p-2 text-neutral-400 transition-all hover:bg-neutral-800 hover:text-yellow-500"
                  title="Compartilhar nota"
                >
                  <FaShare size={14} />
                </button>
              )}

              {note.access?.canDelete && (
                <button
                  onClick={handleDelete}
                  className="rounded-md p-2 text-red-400 transition-all hover:bg-neutral-800 hover:text-red-300"
                  title="Deletar nota"
                >
                  <FaTrash size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Título */}
        <div className="mb-6">
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onBlur={async () => {
              if (note && editingTitle !== note.title) {
                setIsSaving(true);
                try {
                  const updated = await updateNote(note.id, { title: editingTitle });
                  if (updated) setNote(updated);
                } catch (error) {
                  console.error("Erro ao salvar título:", error);
                } finally {
                  setIsSaving(false);
                }
              }
            }}
            placeholder="Título da nota..."
            className="w-full border-b-2 border-transparent bg-transparent pb-1 text-2xl font-bold text-neutral-100 placeholder-neutral-500 outline-none focus:border-yellow-500"
          />
        </div>

        {/* Meta informações */}
        <div className="mb-6 flex flex-wrap items-center gap-6 border-b border-neutral-800 pb-4 text-sm text-neutral-400">
          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <FaTag className="text-yellow-500" size={12} />
              <div className="flex flex-wrap gap-1">
                {note.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="group flex items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-xs text-yellow-500 transition-colors hover:bg-neutral-700"
                  >
                    {tag}
                    {note.access?.canEdit && (
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-neutral-400 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                        title="Remover tag"
                      >
                        <FaTimes size={10} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* Colaboradores */}
          {note.collaborators && note.collaborators.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">Colaboradores:</span>
              <div className="flex flex-wrap gap-2">
                {note.collaborators.map((collab, index) => {
                  const displayName = getCollaboratorDisplayName(collab);
                  const avatarUrl = getCollaboratorAvatarUrl(collab);

                  return (
                    <div
                      key={index}
                      className="group flex items-center gap-2 rounded-lg bg-neutral-800 px-2 py-1 transition-colors hover:bg-neutral-700"
                    >
                      <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-neutral-700 bg-yellow-500">
                        {avatarUrl ? (
                          <Image
                            width={24}
                            height={24}
                            src={avatarUrl}
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-neutral-950">
                            {displayName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-medium text-neutral-300">{displayName}</span>

                      {note.access?.canShare && (
                        <button
                          onClick={() => handleRemoveCollaborator(collab)}
                          className="ml-1 text-neutral-500 opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                          title="Remover colaborador"
                        >
                          <FaTimes size={10} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo - Blocos */}
        <div className="space-y-2">
          {blocks.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block) => (
                  <SortableBlockComponent
                    key={block.id}
                    block={block}
                    noteId={note.id}
                    onUpdate={handleUpdateBlock}
                    onDelete={handleDeleteBlock}
                    onAddBlock={() => setShowBlockTypeSelector(true)}
                  />
                ))}
              </SortableContext>

              {/* Overlay para mostrar o item sendo arrastado */}
              <DragOverlay>
                {activeBlock ? (
                  <div className="rounded-md border border-yellow-500/50 bg-neutral-900 px-2 py-1 shadow-xl">
                    <BlockComponent
                      block={activeBlock}
                      noteId={note.id}
                      onUpdate={handleUpdateBlock}
                      onDelete={handleDeleteBlock}
                      onAddBlock={() => {}}
                      isDragging={true}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="min-h-[200px] rounded-lg border-2 border-dashed border-neutral-700 py-8 text-center text-neutral-500">
              <div className="mb-2">📝</div>
              <p>Esta nota ainda não tem conteúdo.</p>
              <p className="mt-1 text-sm">Clique em &quot;Adicionar bloco&quot; para começar</p>
            </div>
          )}

          {/* Botão para adicionar novo bloco */}
          {note.access?.canEdit && (
            <div className="relative pt-4">
              <button
                onClick={() => setShowBlockTypeSelector(!showBlockTypeSelector)}
                className="flex items-center gap-2 rounded-md border border-dashed border-neutral-700 px-4 py-2 text-sm text-neutral-500 transition-all hover:border-yellow-500 hover:text-yellow-500"
              >
                <FaPlus size={12} />
                Adicionar bloco
              </button>

              {showBlockTypeSelector && (
                <BlockTypeSelector
                  onSelect={(type) => handleAddBlock(type)}
                  onClose={() => setShowBlockTypeSelector(false)}
                />
              )}
            </div>
          )}
        </div>

        {/* Atalhos de teclado */}
        {note.access?.canEdit && (
          <div className="mt-8 border-t border-neutral-800 pt-4">
            <div className="text-xs text-neutral-500">
              <span className="font-semibold">Atalho:</span>
              <span className="ml-2">Ctrl+S para forçar salvamento</span>
            </div>
          </div>
        )}

        {/* Indicador de salvamento */}
        {isSaving && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 shadow-lg">
            <FaSpinner className="animate-spin text-yellow-500" size={14} />
            <span className="text-sm text-neutral-200">Salvando...</span>
          </div>
        )}
      </div>

      {/* Modal de Compartilhamento */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-100">
                <FaUserPlus className="text-yellow-500" size={16} />
                Compartilhar Nota
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-200"
                title="Fechar modal"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">
                  Buscar usuário por email
                </label>
                <div className="relative">
                  <FaSearch
                    className="absolute top-1/2 left-3 -translate-y-1/2 transform text-neutral-400"
                    size={14}
                  />
                  <input
                    type="email"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      handleSearchUsers(e.target.value);
                    }}
                    placeholder="Digite o email do usuário..."
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 py-2 pr-4 pl-10 text-neutral-100 placeholder-neutral-500 focus:border-transparent focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                  />
                  {isSearching && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                      <FaSpinner className="animate-spin text-yellow-500" size={14} />
                    </div>
                  )}
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg bg-neutral-800 p-2 transition-colors hover:bg-neutral-700"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500">
                          <span className="text-xs font-semibold text-neutral-950">
                            {(user.name || user.username).charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-neutral-200">
                            {user.name || user.username}
                          </div>
                          <div className="text-xs text-neutral-400">{user.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleShareNote(user.id)}
                        className="rounded bg-yellow-500 px-3 py-1 text-xs font-medium text-neutral-950 transition-colors hover:bg-yellow-400"
                      >
                        Adicionar
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-neutral-700 pt-4">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-neutral-400 transition-colors hover:text-neutral-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Tags */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-neutral-700 bg-neutral-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-neutral-100">
                <FaTag className="text-yellow-500" size={16} />
                Gerenciar Tags
              </h3>
              <button
                onClick={() => setShowTagModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-200"
                title="Fechar modal"
              >
                <FaTimes size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-300">Nova tag</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Digite o nome da tag..."
                    className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:border-transparent focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddTag}
                    disabled={!newTag.trim()}
                    className="flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-2 text-neutral-950 transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaPlus size={12} />
                    Adicionar
                  </button>
                </div>
              </div>

              {note && note.tags && note.tags.length > 0 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-300">
                    Tags existentes
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="group flex items-center gap-2 rounded-lg bg-neutral-800 px-3 py-1 text-sm text-yellow-500 transition-colors hover:bg-neutral-700"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="text-neutral-400 transition-colors hover:text-red-400"
                          title="Remover tag"
                        >
                          <FaTimes size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-neutral-700 pt-4">
                <button
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2 text-neutral-400 transition-colors hover:text-neutral-200"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteDetail;
