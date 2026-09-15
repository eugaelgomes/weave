"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { useWorkspace } from "@/app/_contexts/workspace-context";
import { type WorkspaceProperties } from "@/app/_services/workspace";
import {
  type DirectSettingsSection,
  type EditableImage,
  type NestedSettingsSection,
  type WorkspaceInfoFormData,
} from "../_components/settings-types";

export const useWorkspaceSettingsPage = () => {
  const { user } = useAuth();
  const {
    workspace,
    loading,
    hasWorkspace,
    getStats,
    isOwner,
    updateWorkspace,
    uploadLogo,
    uploadBanner,
    updateProperties,
    deleteWorkspace,
    restoreWorkspace,
  } = useWorkspace();
  const router = useRouter();
  const params = useParams();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingImage, setEditingImage] = useState<EditableImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<WorkspaceInfoFormData>({
    workspace_name: "",
    unique_name: "",
    slogan: "",
  });
  const [localProps, setLocalProps] = useState<WorkspaceProperties>({});

  useEffect(() => {
    if (!workspace) return;

    setFormData({
      workspace_name: workspace.workspace_name || "",
      unique_name: workspace.unique_name || "",
      slogan: workspace.description || "",
    });
    setLocalProps(workspace.properties || {});
  }, [workspace]);

  const stats = getStats();
  const userIsOwner = user?.id ? isOwner(user.id) : false;

  const handleCreateWorkspace = async () => {
    setIsCreating(true);
    router.push(`/workspace/create`);
  };

  const handleUpdateInfo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workspace) return;

    try {
      await updateWorkspace({
        workspace_name: formData.workspace_name,
        unique_name: formData.unique_name,
        description: formData.slogan,
      });
      toast.success("Informações atualizadas com sucesso");
      setIsEditingInfo(false);
    } catch {
      toast.error("Erro ao atualizar informações");
    }
  };

  const handleUpdateImage = async (fileOrUrl: string | File) => {
    if (!editingImage || !(fileOrUrl instanceof File)) return;

    try {
      if (editingImage === "logo") {
        await uploadLogo(fileOrUrl);
      } else {
        await uploadBanner(fileOrUrl);
      }

      toast.success(`${editingImage === "logo" ? "Logo" : "Banner"} atualizado com sucesso`);
      setEditingImage(null);
    } catch {
      toast.error("Erro ao atualizar imagem");
    }
  };

  const handleDirectPropertyChange = async <S extends DirectSettingsSection>(
    section: S,
    value: WorkspaceProperties[S]
  ) => {
    if (!workspace) return;

    const currentProps = { ...workspace.properties };
    const newProps = {
      ...currentProps,
      [section]: value,
    };

    setLocalProps(newProps);

    try {
      await updateProperties(newProps);
      toast.success("Configuração salva");
    } catch {
      setLocalProps(currentProps);
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleNestedPropertyChange = async <S extends NestedSettingsSection>(
    section: S,
    key: keyof NonNullable<WorkspaceProperties[S]>,
    value: unknown
  ) => {
    if (!workspace) return;

    const currentProps = { ...workspace.properties };
    const sectionValue = currentProps[section];

    const newProps = {
      ...currentProps,
      [section]: {
        ...(sectionValue && typeof sectionValue === "object" ? sectionValue : {}),
        [key]: value,
      },
    };

    setLocalProps(newProps);

    try {
      await updateProperties(newProps);
      toast.success("Configuração salva");
    } catch {
      setLocalProps(currentProps);
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleDeleteWorkspace = async () => {
    if (
      !window.confirm(
        "Tem certeza absoluta? Esta ação não pode ser desfeita imediatamente (embora exista restauração por 30 dias)."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteWorkspace();
      if (success) {
        toast.success("Workspaceanização excluída");
        router.refresh();
      } else {
        toast.error("Falha ao excluir organização");
      }
    } catch {
      toast.error("Erro ao excluir organização");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreWorkspace = async () => {
    try {
      await restoreWorkspace();
      toast.success("Workspaceanização restaurada com sucesso");
    } catch {
      toast.error("Erro ao restaurar organização");
    }
  };

  return {
    workspace,
    loading,
    hasWorkspace,
    stats,
    userIsOwner,
    isCreating,
    isEditingInfo,
    setIsEditingInfo,
    editingImage,
    setEditingImage,
    isDeleting,
    formData,
    setFormData,
    localProps,
    handleCreateWorkspace,
    handleUpdateInfo,
    handleUpdateImage,
    handleDirectPropertyChange,
    handleNestedPropertyChange,
    handleDeleteWorkspace,
    handleRestoreWorkspace,
  };
};
