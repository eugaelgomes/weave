"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import {
  Layers3,
  Loader2,
  Users,
  ChevronRight,
  ChevronDown,
  GitMerge,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  X,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { WorkspaceHeader } from "@/app/(protected)/_components/ui/headers/workspace-header";
import {
  useOrganization,
  type OrganizationArea,
  type OrganizationAreaMember,
  type OrganizationMember,
  type OrganizationAreaMemberRole,
} from "@/app/_contexts/organization-context";
import getStorageUrl from "@/app/_utils/get-storage-url";

// --- Types & Data Structures ---

type TreeNode = {
  area: OrganizationArea;
  children: TreeNode[];
};

const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
  ativo: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  planejamento: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  pausado: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  arquivado: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-700 dark:text-neutral-400",
    dot: "bg-neutral-500",
  },
};

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "planejamento", label: "Planejamento" },
  { value: "pausado", label: "Pausado" },
  { value: "arquivado", label: "Arquivado" },
] as const;

const resolveAreaStatus = (area?: OrganizationArea | null): string => {
  if (!area) return "ativo";
  const fromProps = area.properties?.status?.toLowerCase();
  const raw =
    (typeof fromProps === "string" && fromProps) || (area.active === false ? "pausado" : "ativo");
  const allowed = new Set(STATUS_OPTIONS.map((o) => o.value));
  return allowed.has(raw) ? raw : "ativo";
};

type AreaFormState = {
  area_name: string;
  parent_area_id: string | null;
  description: string;
  active: boolean;
};

type AddMemberFormState = {
  userId: string;
  role: OrganizationAreaMemberRole;
};

const MEMBER_ROLE_OPTIONS: Array<{ value: OrganizationAreaMemberRole; label: string }> = [
  { value: "manager", label: "Gestor" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Observador" },
];

const createEmptyAreaForm = (parentId: string | null = null): AreaFormState => ({
  area_name: "",
  parent_area_id: parentId,
  description: "",
  active: true,
});

const mapAreaToFormState = (area: OrganizationArea): AreaFormState => ({
  area_name: area.area_name || "",
  parent_area_id: area.parent_area_id,
  description: area.description || "",
  active: area.active !== false,
});

const createEmptyMemberForm = (): AddMemberFormState => ({
  userId: "",
  role: "viewer",
});

// --- Page Component ---

export default function AreasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const {
    organization,
    hasOrganization,
    areas,
    areasLoading,
    areasError,
    fetchAreas,
    fetchAreaMembers: fetchAreaMembersFromContext,
    areaMembers,
    areaMembersLoading,
    members: organizationMembers,
    createArea,
    updateArea,
    deleteArea,
    addAreaMember,
    updateAreaMember,
    removeAreaMember,
  } = useOrganization();

  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  // States Modal Area
  const [areaFormOpen, setAreaFormOpen] = useState(false);
  const [areaFormMode, setAreaFormMode] = useState<"create" | "edit">("create");
  const [areaFormValues, setAreaFormValues] = useState<AreaFormState>(createEmptyAreaForm());
  const [areaFormSubmitting, setAreaFormSubmitting] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);

  // States Confirmação & Membros
  const [deletePromptOpen, setDeletePromptOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [addMemberForm, setAddMemberForm] = useState<AddMemberFormState>(createEmptyMemberForm());
  const [addMemberLoading, setAddMemberLoading] = useState(false);
  const [memberActionState, setMemberActionState] = useState<
    Record<string, "updating" | "removing">
  >({});

  // Auto-selecionar primeira área
  useEffect(() => {
    setSelectedAreaId((current) => {
      if (!areas.length) return null;
      if (current && areas.some((area) => area.id === current)) return current;
      return areas[0].id;
    });
  }, [areas]);

  // Foco vindo do fluxo de convite (?areaId=...)
  useEffect(() => {
    const focusId = searchParams.get("areaId");
    if (!focusId || !areas.length) return;
    if (!areas.some((a) => a.id === focusId)) return;
    setSelectedAreaId(focusId);
    requestAnimationFrame(() => {
      document.getElementById(`area-node-${focusId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
    const next = new URLSearchParams(searchParams.toString());
    next.delete("areaId");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [areas, searchParams, pathname, router]);

  const treeRoots = useMemo(() => buildTree(areas), [areas]);
  const selectedArea = useMemo(
    () => areas.find((a) => a.id === selectedAreaId) ?? null,
    [areas, selectedAreaId]
  );

  // Carregar Membros da Área
  useEffect(() => {
    if (!selectedAreaId || areaMembers[selectedAreaId]) return;
    fetchAreaMembersFromContext(selectedAreaId).catch(() => {});
  }, [selectedAreaId, areaMembers, fetchAreaMembersFromContext]);

  const membersForSelected: OrganizationAreaMember[] = selectedAreaId
    ? (areaMembers[selectedAreaId] ?? [])
    : [];
  const membersLoading = Boolean(
    selectedAreaId && areaMembersLoading && !areaMembers[selectedAreaId]
  );

  const availableMembers = useMemo(() => {
    if (!organizationMembers.length) return [];
    const assignedIds = new Set(membersForSelected.map((member) => member.user_id));
    return organizationMembers.filter((member) => !assignedIds.has(member.id));
  }, [organizationMembers, membersForSelected]);

  useEffect(() => {
    setShowAddMemberForm(false);
    setAddMemberForm(createEmptyMemberForm());
  }, [selectedAreaId]);

  // --- Funções de Ação das Áreas ---

  const handleAreaFormChange = (field: keyof AreaFormState, value: string | boolean | null) => {
    setAreaFormValues((prev) => {
      if (field === "active") return { ...prev, active: Boolean(value) };
      if (field === "parent_area_id")
        return { ...prev, parent_area_id: (value as string | null) || null };
      return { ...prev, [field]: (value as string) ?? "" };
    });
  };

  const handleOpenCreateArea = (parentId: string | null = null) => {
    setAreaFormMode("create");
    setAreaFormValues(createEmptyAreaForm(parentId));
    setEditingAreaId(null);
    setAreaFormOpen(true);
  };

  const handleOpenEditArea = () => {
    if (!selectedArea) return;
    setAreaFormMode("edit");
    setEditingAreaId(selectedArea.id);
    setAreaFormValues(mapAreaToFormState(selectedArea));
    setAreaFormOpen(true);
  };

  const handleSubmitAreaForm = async () => {
    if (!areaFormValues.area_name.trim()) {
      toast.error("Defina um nome para a área.");
      return;
    }

    setAreaFormSubmitting(true);
    const normalizedName = areaFormValues.area_name.trim();
    const normalizedDescription = areaFormValues.description.trim();

    const safeParentId =
      areaFormValues.parent_area_id && areaFormValues.parent_area_id === editingAreaId
        ? null
        : areaFormValues.parent_area_id;

    try {
      if (areaFormMode === "create") {
        const created = await createArea({
          area_name: normalizedName,
          parent_area_id: safeParentId || null,
          description: normalizedDescription || null,
          properties: {},
        });
        toast.success("Área criada com sucesso.");
        if (created?.id) setSelectedAreaId(created.id);
      } else if (editingAreaId) {
        await updateArea(editingAreaId, {
          area_name: normalizedName,
          parent_area_id: safeParentId ?? null,
          description: normalizedDescription || null,
          active: areaFormValues.active,
        });
        toast.success("Área atualizada.");
      }
      setAreaFormOpen(false);
      setAreaFormValues(createEmptyAreaForm());
      setEditingAreaId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar a área.");
    } finally {
      setAreaFormSubmitting(false);
    }
  };

  const handleMoveArea = async (draggedId: string, newParentId: string | null) => {
    if (draggedId === newParentId) return;

    // Prevenir Dependência Cíclica (ex: mover avô para dentro do neto)
    let current: OrganizationArea | null = newParentId
      ? (areas.find((a) => a.id === newParentId) ?? null)
      : null;
    while (current) {
      if (current.id === draggedId) {
        toast.error(
          "Movimento inválido: Não é possível mover uma área para dentro dela mesma ou de uma área subordinada."
        );
        return;
      }
      const parentId = current.parent_area_id;
      current = parentId ? (areas.find((a) => a.id === parentId) ?? null) : null;
    }

    const draggedArea = areas.find((a) => a.id === draggedId);
    if (!draggedArea) return;

    // Preservar estado atual e atualizar apenas a hierarquia
    const payload = {
      area_name: draggedArea.area_name,
      parent_area_id: newParentId,
      slug: draggedArea.slug,
      description: draggedArea.description,
      properties: draggedArea.properties,
      active: draggedArea.active,
    };

    try {
      await updateArea(draggedId, payload);
      toast.success("Hierarquia atualizada com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao mover a área.");
    }
  };

  const handleDeleteArea = async () => {
    if (!selectedAreaId) return;
    setDeleteSubmitting(true);
    const targetId = selectedAreaId;
    const fallbackId = areas.find((area) => area.id !== targetId)?.id ?? null;

    try {
      const success = await deleteArea(targetId);
      if (!success) {
        toast.error("Não foi possível remover a área.");
        return;
      }
      toast.success("Área removida.");
      setDeletePromptOpen(false);
      setSelectedAreaId(fallbackId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover área.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleRefreshAreas = () => {
    fetchAreas(true).catch(() => {
      toast.error("Não foi possível atualizar as áreas agora.");
    });
  };

  // --- Funções de Membros ---

  const handleAddMemberFieldChange = (field: keyof AddMemberFormState, value: string) => {
    setAddMemberForm((prev) => ({
      ...prev,
      [field]: field === "role" ? (value as OrganizationAreaMemberRole) : value,
    }));
  };

  const handleAddMember = async () => {
    if (!selectedAreaId) return;
    if (!addMemberForm.userId) return toast.error("Selecione um membro da organização.");

    setAddMemberLoading(true);
    try {
      await addAreaMember(selectedAreaId, {
        user_id: addMemberForm.userId,
        role: addMemberForm.role,
      });
      toast.success("Membro vinculado à área.");
      setAddMemberForm(createEmptyMemberForm());
      setShowAddMemberForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar membro.");
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberId: string, role: OrganizationAreaMemberRole) => {
    if (!selectedAreaId) return;
    setMemberActionState((prev) => ({ ...prev, [memberId]: "updating" }));
    try {
      await updateAreaMember(selectedAreaId, memberId, { role });
      toast.success("Permissão atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar permissão.");
    } finally {
      setMemberActionState((prev) => {
        const { [memberId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedAreaId) return;
    setMemberActionState((prev) => ({ ...prev, [memberId]: "removing" }));
    try {
      await removeAreaMember(selectedAreaId, memberId);
      toast.success("Membro removido da área.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao remover membro.");
    } finally {
      setMemberActionState((prev) => {
        const { [memberId]: _removed, ...rest } = prev;
        return rest;
      });
    }
  };

  if (!hasOrganization) {
    return (
      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-2xl flex-col items-center justify-center gap-2 p-2 text-center">
        <div className="flex flex-col items-center gap-2 rounded-md border border-neutral-200 bg-white p-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <Layers3 className="h-10 w-10 text-neutral-300 dark:text-neutral-700" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Estrutura não encontrada
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Configure a sua organização para visualizar o mapa de squads.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full flex-col gap-2">
      <WorkspaceHeader />

      {areasError && (
        <div className="flex-shrink-0 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {areasError}
        </div>
      )}

      {areasLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-md border border-neutral-200 bg-white shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
          <div className="flex flex-col items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-xs font-medium">A mapear hierarquia...</p>
          </div>
        </div>
      ) : !areas.length ? (
        <EmptyAreasState
          orgName={organization?.org_name}
          onRefresh={handleRefreshAreas}
          onCreate={() => handleOpenCreateArea(null)}
          refreshing={areasLoading}
        />
      ) : (
        <section className="grid min-h-0 flex-1 items-stretch gap-2 px-1 sm:px-0 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* MAPA TOPOLÓGICO COM DRAG AND DROP */}
          <div
            className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              // Permite arrastar para o fundo da lista para transformar numa área "raiz"
              const draggedId = e.dataTransfer.getData("areaId");
              if (draggedId) {
                // Como não dropou diretamente num nó específico, definimos parent como null
                handleMoveArea(draggedId, null);
              }
            }}
          >
            <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-neutral-200 px-2 py-2 dark:border-surface-dark-border">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <h2 className="shrink-0 text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                  Mapa Estrutural
                </h2>
                <span
                  className="hidden shrink-0 text-neutral-300 sm:inline dark:text-neutral-600"
                  aria-hidden
                >
                  ·
                </span>
                <span className="min-w-0 truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  {organization?.org_name ?? "—"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshAreas}
                disabled={areasLoading}
                aria-label={areasLoading ? "A sincronizar…" : "Atualizar mapa"}
                title="Atualizar mapa. Arraste áreas para reorganizar ou use (+) para criar sub-áreas."
                className={clsx(
                  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors",
                  "hover:border-neutral-300 hover:bg-white hover:text-neutral-900",
                  "dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-100",
                  areasLoading && "cursor-not-allowed opacity-60"
                )}
              >
                <RefreshCw className={clsx("h-3.5 w-3.5", areasLoading && "animate-spin")} />
              </button>
            </div>
            <div
              className="min-h-0 flex-1 overflow-auto p-2"
              title="Arraste áreas para reorganizar ou use (+) para criar sub-áreas."
            >
            <div className="flex min-w-max flex-col gap-2">
              {treeRoots.map((rootNode) => (
                <TreeNodeView
                  key={rootNode.area.id}
                  node={rootNode}
                  selectedId={selectedAreaId}
                  onSelect={setSelectedAreaId}
                  onCreateSub={handleOpenCreateArea}
                  onMove={handleMoveArea}
                />
              ))}
            </div>
            </div>
          </div>

          {/* PAINEL DE CONTEXTO */}
          <DetailPanel
            area={selectedArea}
            members={membersForSelected}
            membersLoading={membersLoading}
            onEditArea={handleOpenEditArea}
            onDeleteArea={() => setDeletePromptOpen(true)}
            availableMembers={availableMembers}
            addMemberForm={addMemberForm}
            onAddMemberFieldChange={handleAddMemberFieldChange}
            addMemberLoading={addMemberLoading}
            showAddMemberForm={showAddMemberForm}
            onToggleAddMemberForm={() => setShowAddMemberForm((prev) => !prev)}
            onCloseAddMemberForm={() => setShowAddMemberForm(false)}
            onAddMember={handleAddMember}
            onUpdateMemberRole={handleUpdateMemberRole}
            onRemoveMember={handleRemoveMember}
            memberActionState={memberActionState}
          />
        </section>
      )}

      <AreaFormModal
        open={areaFormOpen}
        mode={areaFormMode}
        form={areaFormValues}
        areas={areas}
        disableParentId={editingAreaId}
        onChange={handleAreaFormChange}
        onClose={() => {
          if (!areaFormSubmitting) setAreaFormOpen(false);
        }}
        onSubmit={handleSubmitAreaForm}
        submitting={areaFormSubmitting}
      />

      <ConfirmDialog
        open={deletePromptOpen}
        title="Remover área"
        description="Esta ação não pode ser desfeita e removerá os vínculos de membros associados."
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        loading={deleteSubmitting}
        onCancel={() => {
          if (!deleteSubmitting) setDeletePromptOpen(false);
        }}
        onConfirm={handleDeleteArea}
      />
    </div>
  );
}

// --- Hierarchy Engine & Map View (Com DnD e Atalhos) ---

const buildTree = (areas: OrganizationArea[]): TreeNode[] => {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  areas.forEach((area) => map.set(area.id, { area, children: [] }));
  areas.forEach((area) => {
    const node = map.get(area.id)!;
    if (area.parent_area_id && map.has(area.parent_area_id)) {
      map.get(area.parent_area_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};

type TreeNodeViewProps = {
  node: TreeNode;
  level?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateSub: (parentId: string) => void;
  onMove: (draggedId: string, newParentId: string | null) => void;
};

const TreeNodeView = ({
  node,
  level = 0,
  selectedId,
  onSelect,
  onCreateSub,
  onMove,
}: TreeNodeViewProps) => {
  const hasChildren = node.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const isSelected = selectedId === node.area.id;
  const status = resolveAreaStatus(node.area);
  const style = statusStyles[status] ?? statusStyles.ativo;
  const headcount = (node.area.properties?.metrics as any)?.headcount || 0;

  // Handlers do Drag and Drop Nativo HTML5
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData("areaId", node.area.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const draggedId = e.dataTransfer.getData("areaId");
    if (draggedId && draggedId !== node.area.id) {
      onMove(draggedId, node.area.id);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  return (
    <div className="group/tree relative flex flex-col bg-transparent">
      <div className="relative z-10 flex items-center gap-2 py-1">
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <div className="h-5 w-5 flex-shrink-0" />
        )}

        <div
          id={`area-node-${node.area.id}`}
          draggable
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => onSelect(node.area.id)}
          className={clsx(
            "group/card relative flex w-[240px] cursor-grab flex-col gap-1 rounded-md border p-2 text-left transition-all active:cursor-grabbing",
            isSelected
              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-500 dark:bg-blue-900/30"
              : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-surface-dark-border dark:bg-[#1d1d1b] hover:dark:border-surface-dark-border-strong",
            isDragOver && "border-dashed border-blue-500 bg-blue-100/50 dark:bg-blue-900/20"
          )}
        >
          <div className="flex items-start justify-between">
            <h3 className="truncate pr-2 text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {node.area.area_name}
            </h3>
            <span
              className={clsx("mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full", style.dot)}
              title={`Status: ${status}`}
            />
          </div>

          <div className="mt-0.5 flex items-center justify-between">
            <p className="max-w-[160px] truncate text-[10px] text-neutral-500">
              {node.area.description || "Sem descrição"}
            </p>
            <div
              className="flex items-center gap-1 text-[10px] font-medium text-neutral-500 dark:text-neutral-400"
              title="Pessoas alocadas"
            >
              <Users className="h-3 w-3" />
              <span>{headcount}</span>
            </div>
          </div>

          {/* Botão Contextual para Criar Sub-área (Injetado via Hover) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateSub(node.area.id);
              setIsExpanded(true); // Garante que a árvore abra para mostrar o novo filho
            }}
            className="absolute top-1/2 right-[-26px] flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 opacity-0 shadow-sm transition-all group-hover/card:opacity-100 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-surface-dark-border-strong dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-blue-800 dark:hover:bg-blue-900/50 dark:hover:text-blue-400"
            title="Criar subárea"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="relative ml-[9px] flex flex-col pl-5">
          {node.children.map((child, index) => {
            const isLast = index === node.children.length - 1;

            return (
              <div key={child.area.id} className="relative">
                {/* Linha vertical contínua para os próximos irmãos (fica oculta no último) */}
                {!isLast && (
                  <div className="absolute top-0 bottom-0 -left-5 border-l-2 border-yellow-500/50 dark:border-yellow-500/50" />
                )}

                {/* Cotovelo arredondado ligando a linha principal ao card atual */}
                <div className="absolute top-0 -left-5 h-[32px] w-5 rounded-bl-xl border-b-2 border-l-2 border-yellow-500/50 dark:border-yellow-500/50" />

                <TreeNodeView
                  node={child}
                  level={level + 1}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onCreateSub={onCreateSub}
                  onMove={onMove}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Context & Details Panel ---

type DetailPanelProps = {
  area: OrganizationArea | null;
  members: OrganizationAreaMember[];
  membersLoading: boolean;
  onEditArea: () => void;
  onDeleteArea: () => void;
  availableMembers: OrganizationMember[];
  addMemberForm: AddMemberFormState;
  onAddMemberFieldChange: (field: keyof AddMemberFormState, value: string) => void;
  addMemberLoading: boolean;
  showAddMemberForm: boolean;
  onToggleAddMemberForm: () => void;
  onCloseAddMemberForm: () => void;
  onAddMember: () => void;
  onUpdateMemberRole: (memberId: string, role: OrganizationAreaMemberRole) => void;
  onRemoveMember: (memberId: string) => void;
  memberActionState: Record<string, "updating" | "removing">;
};

const DetailPanel = ({
  area,
  members,
  membersLoading,
  onEditArea,
  onDeleteArea,
  availableMembers,
  addMemberForm,
  onAddMemberFieldChange,
  addMemberLoading,
  showAddMemberForm,
  onToggleAddMemberForm,
  onCloseAddMemberForm,
  onAddMember,
  onUpdateMemberRole,
  onRemoveMember,
  memberActionState,
}: DetailPanelProps) => {
  if (!area) {
    return (
      <aside className="h-full rounded-md border border-neutral-200 bg-white p-2 shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b]">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Selecione uma área no mapa para detalhes.
        </p>
      </aside>
    );
  }

  const status = resolveAreaStatus(area);
  const style = statusStyles[status] ?? statusStyles.ativo;
  const tags = (area.properties?.tags as string[]) ?? [];
  const headcount =
    typeof area.properties?.metrics?.headcount === "number"
      ? area.properties?.metrics?.headcount
      : null;

  return (
    <aside className="flex h-full flex-col gap-2 overflow-y-auto rounded-md border border-neutral-200 bg-white p-2 shadow-sm dark:shadow-surface-dark-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-800">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm leading-tight font-semibold text-neutral-900 dark:text-white">
              {area.area_name}
            </h3>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
              {area.slug || area.id}
            </p>
          </div>
          <span
            className={clsx(
              "inline-flex flex-shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium tracking-wider uppercase",
              style.bg,
              style.text
            )}
          >
            {status}
          </span>
        </div>

        {area.description ? (
          <p className="text-[10px] leading-relaxed text-neutral-600 dark:text-neutral-400">
            {area.description}
          </p>
        ) : (
          <p className="text-[10px] text-neutral-400 italic dark:text-neutral-500">
            Nenhuma descrição fornecida.
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-[10px]">
          <button
            type="button"
            onClick={onEditArea}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-0.5 font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-surface-dark-border-strong dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
          >
            <Pencil className="h-3 w-3" /> Editar área
          </button>
          <button
            type="button"
            onClick={onDeleteArea}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-0.5 font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3 w-3" /> Remover
          </button>
        </div>
      </div>

      {headcount !== null && (
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
            <p className="text-[9px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
              Headcount
            </p>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">{headcount}</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-surface-dark-border dark:bg-[#1d1d1b]">
            <p className="text-[9px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
              Ativo
            </p>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">
              {area.active === false ? "Não" : "Sim"}
            </p>
          </div>
        </div>
      )}

      {tags.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            Contexto
          </p>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 border-t border-neutral-100 pt-2 dark:border-surface-dark-border-muted">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-neutral-900 dark:text-neutral-100">
            <Users className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400" />
            <h4 className="text-xs font-semibold">Pessoas Alocadas</h4>
          </div>
          <button
            type="button"
            onClick={showAddMemberForm ? onCloseAddMemberForm : onToggleAddMemberForm}
            disabled={!availableMembers.length && !showAddMemberForm}
            className={clsx(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold transition",
              showAddMemberForm
                ? "border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-surface-dark-border-strong dark:text-neutral-200"
                : "border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300",
              !availableMembers.length && !showAddMemberForm && "cursor-not-allowed opacity-50"
            )}
          >
            <UserPlus className="h-3 w-3" /> {showAddMemberForm ? "Fechar" : "Adicionar"}
          </button>
        </div>

        {showAddMemberForm && (
          <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-[10px] dark:border-surface-dark-border dark:bg-[#1d1d1b]">
            {availableMembers.length ? (
              <>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-300">
                    Pessoa
                  </label>
                  <select
                    value={addMemberForm.userId}
                    onChange={(event) => onAddMemberFieldChange("userId", event.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-neutral-800 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:focus:border-yellow-500/50 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-100"
                  >
                    <option value="">Selecione um membro</option>
                    {availableMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name || member.username || member.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-300">
                    Permissão na área
                  </label>
                  <select
                    value={addMemberForm.role}
                    onChange={(event) => onAddMemberFieldChange("role", event.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-neutral-800 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:focus:border-yellow-500/50 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-100"
                  >
                    {MEMBER_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onCloseAddMemberForm}
                    className="rounded-md border border-neutral-200 px-2 py-1 font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-surface-dark-border-strong dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={onAddMember}
                    disabled={addMemberLoading}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 font-semibold text-white hover:bg-blue-500",
                      addMemberLoading && "opacity-70"
                    )}
                  >
                    {addMemberLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                    Vincular membro
                  </button>
                </div>
              </>
            ) : (
              <p className="text-neutral-500 dark:text-neutral-400">
                Todos os membros já estão alocados nesta área.
              </p>
            )}
          </div>
        )}

        {membersLoading ? (
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-3 w-3 animate-spin" /> A carregar...
          </div>
        ) : members.length ? (
          <div className="flex flex-col gap-1.5">
            {members.map((member) => {
              const actionState = memberActionState[member.user_id];
              const memberRoleValue = member.role || "";
              const roleExists = MEMBER_ROLE_OPTIONS.some(
                (option) => option.value === memberRoleValue
              );
              return (
                <div
                  key={member.user_id}
                  className="flex items-center gap-2 rounded-md border border-transparent p-1 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/60"
                >
                  <div className="h-7 w-7 flex-shrink-0 overflow-hidden rounded-md bg-neutral-200 dark:bg-neutral-800">
                    {member.avatar_url ? (
                      <Image
                        src={getStorageUrl(member.avatar_url)}
                        alt={member.name || member.username || "Avatar"}
                        width={28}
                        height={28}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
                        {(member.name || member.username || "?").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {member.name || member.username || member.email}
                    </p>
                    <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                      {member.email}
                    </p>
                  </div>
                  <select
                    value={memberRoleValue}
                    onChange={(event) =>
                      onUpdateMemberRole(
                        member.user_id,
                        event.target.value as OrganizationAreaMemberRole
                      )
                    }
                    disabled={actionState === "updating"}
                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[10px] text-neutral-700 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:focus:border-yellow-500/50 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-100"
                  >
                    {!roleExists && memberRoleValue && (
                      <option value={memberRoleValue}>{memberRoleValue}</option>
                    )}
                    {MEMBER_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveMember(member.user_id)}
                    disabled={actionState === "removing"}
                    className="rounded-md border border-transparent p-1 text-neutral-500 transition hover:text-red-600 disabled:opacity-50 dark:text-neutral-400 dark:hover:text-red-400"
                  >
                    {actionState === "removing" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
            Nenhum membro vinculado.
          </p>
        )}
      </div>
    </aside>
  );
};

// --- Empty State & Modals ---

type EmptyAreasStateProps = {
  orgName?: string;
  onRefresh: () => void;
  onCreate?: () => void;
  refreshing?: boolean;
};

const EmptyAreasState = ({
  orgName,
  onRefresh,
  onCreate,
  refreshing = false,
}: EmptyAreasStateProps) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
    <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-neutral-200 px-2 py-2 dark:border-surface-dark-border">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h2 className="shrink-0 text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
          Mapa Estrutural
        </h2>
        <span className="hidden shrink-0 text-neutral-300 sm:inline dark:text-neutral-600" aria-hidden>
          ·
        </span>
        <span className="min-w-0 truncate text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {orgName ?? "—"}
        </span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label={refreshing ? "A sincronizar…" : "Atualizar mapa"}
        title="Atualizar mapa"
        className={clsx(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-600 transition-colors",
          "hover:border-neutral-300 hover:bg-white hover:text-neutral-900",
          "dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-300 dark:hover:border-neutral-600 dark:hover:bg-neutral-800/80 dark:hover:text-neutral-100",
          refreshing && "cursor-not-allowed opacity-60"
        )}
      >
        <RefreshCw className={clsx("h-3.5 w-3.5", refreshing && "animate-spin")} />
      </button>
    </div>
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-2 py-2 text-center">
      <GitMerge className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Nenhuma hierarquia</h3>
      <p className="max-w-xs text-[10px] text-neutral-500 dark:text-neutral-400">
        Crie áreas e vincule filhas para construir o mapa.
      </p>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-1 inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs font-medium text-neutral-800 transition hover:bg-white dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          <Plus className="h-3 w-3" /> Nova área
        </button>
      )}
    </div>
  </div>
);

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal = ({ open, title, description, onClose, children }: ModalProps) => {
  if (!open) return null;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-2 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-md"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:outline-none dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          aria-label="Fechar modal"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-2 pr-10">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>
          ) : null}
        </div>

        <div className="max-h-[min(70vh,32rem)] flex-1 overflow-y-auto border-t border-neutral-200 p-2 text-sm dark:border-surface-dark-border">
          {children}
        </div>
      </div>
    </div>
  );
};

type AreaFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  form: AreaFormState;
  areas: OrganizationArea[];
  disableParentId: string | null;
  onChange: (field: keyof AreaFormState, value: string | boolean | null) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
};

const fieldInputClass =
  "w-full rounded-md border border-neutral-200 bg-white px-2 py-2 text-xs text-neutral-900 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-surface-dark-border-strong dark:bg-[#1d1d1b] dark:text-neutral-100 dark:focus:border-yellow-500/50";

const AreaFormModal = ({
  open,
  mode,
  form,
  areas,
  disableParentId,
  onChange,
  onClose,
  onSubmit,
  submitting,
}: AreaFormModalProps) => {
  const nameId = React.useId();
  const parentId = React.useId();
  const descId = React.useId();
  const activeId = React.useId();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitting) onSubmit();
  };

  const modalDescription =
    mode === "create"
      ? "Nome obrigatório. Slug é gerado no servidor. Descrição é opcional."
      : "Altere nome, nível na hierarquia ou descrição. Slug atualiza quando o nome muda.";

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nova área" : "Editar área"}
      description={modalDescription}
      onClose={onClose}
    >
      <form className="space-y-2" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label
            htmlFor={nameId}
            className="text-xs font-medium text-neutral-700 dark:text-neutral-200"
          >
            Nome <span className="text-red-600">*</span>
          </label>
          <input
            id={nameId}
            type="text"
            value={form.area_name}
            onChange={(event) => onChange("area_name", event.target.value)}
            className={fieldInputClass}
            placeholder="Ex.: Squad Apollo"
            required
            autoFocus
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor={parentId}
            className="text-xs font-medium text-neutral-700 dark:text-neutral-200"
          >
            Área pai
          </label>
          <select
            id={parentId}
            value={form.parent_area_id || ""}
            onChange={(event) => onChange("parent_area_id", event.target.value || null)}
            className={fieldInputClass}
            aria-label="Área pai na hierarquia"
          >
            <option value="">Raiz (sem pai)</option>
            {areas
              .filter((area) => area.id !== disableParentId)
              .map((area) => (
                <option key={area.id} value={area.id}>
                  {area.area_name}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1">
          <label
            htmlFor={descId}
            className="text-xs font-medium text-neutral-700 dark:text-neutral-200"
          >
            Descrição <span className="font-normal text-neutral-400">(opcional)</span>
          </label>
          <textarea
            id={descId}
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            rows={2}
            className={`${fieldInputClass} resize-none`}
            placeholder="Breve contexto da área"
          />
        </div>

        {mode === "edit" ? (
          <label
            htmlFor={activeId}
            className="flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-200"
          >
            <input
              id={activeId}
              type="checkbox"
              checked={form.active}
              onChange={(event) => onChange("active", event.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-300 text-brand-primary-500 focus:ring-yellow-500 dark:border-surface-dark-border-muted"
            />
            Área ativa
          </label>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-2 dark:border-surface-dark-border-muted">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-neutral-200 px-2 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-surface-dark-border-strong dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-md bg-brand-primary-500 px-2 py-2 text-xs font-medium text-white transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:opacity-70 dark:hover:bg-yellow-600"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {mode === "create" ? "Criar" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  loading = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => (
  <Modal open={open} title={title} description={description} onClose={onCancel}>
    <div className="flex items-center justify-end gap-2 text-xs">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="rounded-md border border-neutral-200 px-2 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-surface-dark-border-strong dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
        {confirmLabel}
      </button>
    </div>
  </Modal>
);
