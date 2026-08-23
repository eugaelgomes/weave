"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/_contexts/auth-context";
import { useOrganization } from "@/app/_contexts/organization-context";
import { type OrganizationProperties } from "@/app/_services/organization";
import {
  type DirectSettingsSection,
  type EditableImage,
  type NestedSettingsSection,
  type OrganizationInfoFormData,
} from "@/app/(protected)/organization/general/_components/settings-types";

export const useOrganizationSettingsPage = () => {
  const { user } = useAuth();
  const {
    organization,
    loading,
    hasOrganization,
    getStats,
    isOwner,
    updateOrganization,
    uploadLogo,
    uploadBanner,
    updateProperties,
    deleteOrganization,
    restoreOrganization,
  } = useOrganization();
  const router = useRouter();
  const params = useParams();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingImage, setEditingImage] = useState<EditableImage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<OrganizationInfoFormData>({
    org_name: "",
    unique_name: "",
    slogan: "",
  });
  const [localProps, setLocalProps] = useState<OrganizationProperties>({});

  useEffect(() => {
    if (!organization) return;

    setFormData({
      org_name: organization.org_name || "",
      unique_name: organization.unique_name || "",
      slogan: organization.description || "",
    });
    setLocalProps(organization.properties || {});
  }, [organization]);

  const stats = getStats();
  const userIsOwner = user?.id ? isOwner(user.id) : false;

  const handleCreateOrganization = async () => {
    setIsCreating(true);
    router.push(`/organization/create`);
  };

  const handleUpdateInfo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!organization) return;

    try {
      await updateOrganization({
        org_name: formData.org_name,
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
    value: OrganizationProperties[S]
  ) => {
    if (!organization) return;

    const currentProps = { ...organization.properties };
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
    key: keyof NonNullable<OrganizationProperties[S]>,
    value: unknown
  ) => {
    if (!organization) return;

    const currentProps = { ...organization.properties };
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

  const handleDeleteOrganization = async () => {
    if (
      !window.confirm(
        "Tem certeza absoluta? Esta ação não pode ser desfeita imediatamente (embora exista restauração por 30 dias)."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteOrganization();
      if (success) {
        toast.success("Organização excluída");
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

  const handleRestoreOrganization = async () => {
    try {
      await restoreOrganization();
      toast.success("Organização restaurada com sucesso");
    } catch {
      toast.error("Erro ao restaurar organização");
    }
  };

  return {
    organization,
    loading,
    hasOrganization,
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
    handleCreateOrganization,
    handleUpdateInfo,
    handleUpdateImage,
    handleDirectPropertyChange,
    handleNestedPropertyChange,
    handleDeleteOrganization,
    handleRestoreOrganization,
  };
};
