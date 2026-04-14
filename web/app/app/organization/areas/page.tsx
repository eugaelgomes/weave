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
  Plus,
  Trash2,
  Pencil,
  X,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { OrganizationHeader } from "@/app/app/_components/ui/headers/organization-header";
import {
  useOrganization,
  type OrganizationArea,
  type OrganizationAreaMember,
  type OrganizationMember,
  type OrganizationAreaMemberRole,
  type OrganizationAreaProperties,
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

const resolveAreaStatus = (area?: OrganizationArea | null): string => {
  if (!area) return "ativo";
  return area.properties?.status?.toLowerCase() || (area.active === false ? "pausado" : "ativo");
};

const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "planejamento", label: "Planejamento" },
  { value: "pausado", label: "Pausado" },
  { value: "arquivado", label: "Arquivado" },
];

const MEMBER_ROLE_OPTIONS: Array<{ value: OrganizationAreaMemberRole; label: string }> = [
  { value: "manager", label: "Gestor" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Observador" },
];

type AreaFormState = {
  area_name: string;
  parent_area_id: string | null;
  slug: string;
  description: string;
  status: string;
  tags: string;
  headcount: string;
  active: boolean;
};

type AddMemberFormState = {
  userId: string;
  role: OrganizationAreaMemberRole;
};

const createEmptyAreaForm = (parentId: string | null = null): AreaFormState => ({
  area_name: "",
  parent_area_id: parentId,
  slug: "",
  description: "",
  status: "ativo",
  tags: "",
  headcount: "",
  active: true,
});

const mapAreaToFormState = (area: OrganizationArea): AreaFormState => ({
  area_name: area.area_name || "",
  parent_area_id: area.parent_area_id,
  slug: area.slug || "",
  description: area.description || "",
  status: resolveAreaStatus(area),
  tags: (area.properties?.tags ?? []).join(", "),
  headcount:
    typeof area.properties?.metrics?.headcount === "number"
      ? String(area.properties.metrics.headcount)
      : "",
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
    const tags = areaFormValues.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const existingArea = editingAreaId ? areas.find((area) => area.id === editingAreaId) : null;
    const baseProperties = (existingArea?.properties ?? {}) as OrganizationAreaProperties;
    const properties: OrganizationAreaProperties = {
      ...baseProperties,
      status: areaFormValues.status,
    };

    if (tags.length) properties.tags = tags;
    else delete properties.tags;

    const baseMetrics = baseProperties.metrics ? { ...baseProperties.metrics } : undefined;
    const headcountValue =
      areaFormValues.headcount.trim() !== "" ? Number(areaFormValues.headcount) : null;

    if (headcountValue !== null && !Number.isNaN(headcountValue)) {
      properties.metrics = { ...(baseMetrics ?? {}), headcount: headcountValue };
    } else if (baseMetrics) {
      delete baseMetrics.headcount;
      if (Object.keys(baseMetrics).length) properties.metrics = baseMetrics;
      else delete properties.metrics;
    } else {
      delete properties.metrics;
    }

    const safeParentId =
      areaFormValues.parent_area_id && areaFormValues.parent_area_id === editingAreaId
        ? null
        : areaFormValues.parent_area_id;

    const basePayload = {
      area_name: normalizedName,
      parent_area_id: safeParentId || null,
      slug: areaFormValues.slug.trim() || undefined,
      description: normalizedDescription ? normalizedDescription : null,
      properties,
    };

    try {
      if (areaFormMode === "create") {
        const created = await createArea(basePayload);
        toast.success("Área criada com sucesso.");
        if (created?.id) setSelectedAreaId(created.id);
      } else if (editingAreaId) {
        await updateArea(editingAreaId, { ...basePayload, active: areaFormValues.active });
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
      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-2xl flex-col items-center justify-center gap-4 p-4 text-center">
        <div className="flex flex-col items-center gap-4 rounded-md border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-950">
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
      <OrganizationHeader />

      {/* Cabeçalho Minimalista e Responsivo */}
      <div className="flex shrink-0 flex-col gap-4 rounded-md border-1 border-neutral-100 bg-white px-4 py-2 shadow-sm md:flex-row md:items-center md:justify-between dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
              Mapa Estrutural
            </h1>
            <div className="h-1 w-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            <span className="text-xs font-medium text-neutral-400">{organization?.org_name}</span>
          </div>
          <p className="text-xs text-neutral-500">
            Arraste áreas para reorganizar ou use (+) para criar sub-áreas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefreshAreas}
            disabled={areasLoading}
            className={clsx(
              "inline-flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium transition-all",
              "bg-white text-neutral-700 hover:bg-neutral-50 active:scale-[0.98]",
              "dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-900",
              areasLoading && "cursor-not-allowed opacity-50"
            )}
          >
            <GitMerge className={clsx("h-3.5 w-3.5", areasLoading && "animate-spin")} />
            {areasLoading ? "Sincronizando" : "Atualizar"}
          </button>
        </div>
      </div>

      {areasError && (
        <div className="flex-shrink-0 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400">
          {areasError}
        </div>
      )}

      {areasLoading ? (
        <div className="flex flex-1 items-center justify-center rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex flex-col items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-xs font-medium">A mapear hierarquia...</p>
          </div>
        </div>
      ) : !areas.length ? (
        <EmptyAreasState
          onRefresh={handleRefreshAreas}
          onCreate={() => handleOpenCreateArea(null)}
        />
      ) : (
        <section className="grid min-h-0 flex-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* MAPA TOPOLÓGICO COM DRAG AND DROP */}
          <div
            className="h-full overflow-auto rounded-md border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
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
            <div className="flex min-w-max flex-col gap-3">
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
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-500 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800"
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
              : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 hover:dark:border-neutral-700",
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
            className="absolute top-1/2 right-[-26px] flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-500 opacity-0 shadow-sm transition-all group-hover/card:opacity-100 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:border-blue-800 dark:hover:bg-blue-900/50 dark:hover:text-blue-400"
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
      <aside className="h-full rounded-md border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
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
    <aside className="flex h-full flex-col gap-4 overflow-y-auto rounded-md border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-800">
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
            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-0.5 font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:border-neutral-600 dark:hover:bg-neutral-900"
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
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-[9px] font-semibold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
              Headcount
            </p>
            <p className="text-lg font-semibold text-neutral-900 dark:text-white">{headcount}</p>
          </div>
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900">
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
                className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-neutral-100 pt-3 dark:border-neutral-800/50">
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
                ? "border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200"
                : "border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300",
              !availableMembers.length && !showAddMemberForm && "cursor-not-allowed opacity-50"
            )}
          >
            <UserPlus className="h-3 w-3" /> {showAddMemberForm ? "Fechar" : "Adicionar"}
          </button>
        </div>

        {showAddMemberForm && (
          <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-[10px] dark:border-neutral-800 dark:bg-neutral-900">
            {availableMembers.length ? (
              <>
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-600 dark:text-neutral-300">
                    Pessoa
                  </label>
                  <select
                    value={addMemberForm.userId}
                    onChange={(event) => onAddMemberFieldChange("userId", event.target.value)}
                    className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-neutral-800 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
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
                    className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-neutral-800 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
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
                    className="rounded-md border border-neutral-200 px-2 py-1 font-semibold text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
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
                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-[10px] text-neutral-700 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
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
  onRefresh: () => void;
  onCreate?: () => void;
};

const EmptyAreasState = ({ onRefresh, onCreate }: EmptyAreasStateProps) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white py-10 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <GitMerge className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Nenhuma hierarquia</h3>
    <p className="max-w-xs text-[10px] text-neutral-500 dark:text-neutral-400">
      Crie áreas e vincule filhas para construir o mapa.
    </p>
    <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-xs font-medium">
      <button
        type="button"
        onClick={onRefresh}
        className="text-blue-600 hover:underline dark:text-blue-400"
      >
        Atualizar visualização
      </button>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-blue-600 transition hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-300"
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
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-t-4 border-neutral-200 border-t-yellow-500 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950" // Detalhe de destaque superior
        onClick={(event) => event.stopPropagation()}
      >
        {/* Botão Fechar com foco em amarelo */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-neutral-500 transition-all hover:bg-yellow-50 hover:text-yellow-600 focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:outline-none dark:hover:bg-yellow-900/20 dark:hover:text-brand-primary-500"
          aria-label="Fechar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="p-6 pb-2">
          <div className="mb-1 flex items-center gap-2">
            {/* Opcional: Um pequeno detalhe visual antes do título */}
            <div className="h-4 w-1 rounded-full bg-brand-primary-500" />
            <h2 className="text-lg leading-none font-bold tracking-tight text-neutral-900 dark:text-white">
              {title}
            </h2>
          </div>
          {description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
          )}
        </div>

        {/* Área de Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 pt-2 text-sm selection:bg-yellow-100 dark:selection:bg-yellow-900/30">
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
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitting) onSubmit();
  };

  return (
    <Modal
      open={open}
      title={mode === "create" ? "Nova área" : "Editar área"}
      description="Defina as informações organizacionais e relacionamentos hierárquicos."
      onClose={onClose}
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            Nome
          </label>
          <input
            type="text"
            value={form.area_name}
            onChange={(event) => onChange("area_name", event.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="Squad Apollo"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            Área pai
          </label>
          <select
            value={form.parent_area_id || ""}
            onChange={(event) => onChange("parent_area_id", event.target.value || null)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <option value="">Sem vínculo (nível raiz)</option>
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
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            Slug
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(event) => onChange("slug", event.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="squad-apollo"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            Descrição
          </label>
          <textarea
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            rows={3}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="Responsável pelo discovery de integrações..."
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              Status operacional
            </label>
            <select
              value={form.status}
              onChange={(event) => onChange("status", event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
              Headcount
            </label>
            <input
              type="number"
              min={0}
              value={form.headcount}
              onChange={(event) => onChange("headcount", event.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="12"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            Tags (separadas por vírgula)
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(event) => onChange("tags", event.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-blue-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="mobile, discovery"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => onChange("active", event.target.checked)}
            className="h-3.5 w-3.5 rounded border border-neutral-400 text-blue-600 focus:ring-blue-500"
          />
          Área ativa
        </label>

        <div className="flex items-center justify-end gap-2 pt-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-neutral-200 px-3 py-2 font-semibold text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-blue-500 dark:hover:bg-blue-400"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            {mode === "create" ? "Criar área" : "Salvar alterações"}
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
        className="rounded-md border border-neutral-200 px-3 py-2 font-semibold text-neutral-600 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
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
