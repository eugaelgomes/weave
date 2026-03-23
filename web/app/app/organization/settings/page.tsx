"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/app/_contexts/organization-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { type OrganizationProperties } from "@/app/_services/organization";
import { Building2, Trash2, RefreshCw, Plus, Activity } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Internal Components
import { ImageEditModal } from "./_components/ui-elements";
import { SettingsForm } from "./_components/settings-form";
import { OrganizationOverview } from "./_components/overview";

const OrganizationPage = () => {
  const { user } = useAuth();
  const {
    organization,
    loading,
    hasOrganization,
    getStats,
    isOwner,
    createOrganization,
    updateOrganization,
    updateProperties,
    deleteOrganization,
    restoreOrganization,
  } = useOrganization();
  const router = useRouter();

  const [isCreating, setIsCreating] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editingImage, setEditingImage] = useState<"logo" | "banner" | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states matching Organization interface data
  const [formData, setFormData] = useState({
    org_name: "",
    description: "",
    unique_name: "",
  });

  // Local properties state for immediate UI feedback before saving
  const [localProps, setLocalProps] = useState<OrganizationProperties>({});

  useEffect(() => {
    if (organization) {
      setFormData({
        org_name: organization.org_name || "",
        description: organization.description || "",
        unique_name: organization.unique_name || "",
      });
      setLocalProps(organization.properties || {});
    }
  }, [organization]);

  const stats = getStats();
  const userIsOwner = user?.id ? isOwner(user.id) : false;

  // --- Handlers ---

  const handleCreateOrganization = async () => {
    setIsCreating(true);
    // Simple placeholder creation logic if needed, usually redirects to a creation page or opens a modal
    // For now we assume a separate flow or simple creation here
    try {
      await createOrganization({
        org_name: "Nova Organização",
        description: "Minha nova organização no Weave Notes",
      });
      toast.success("Organização criada com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar organização");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    try {
      await updateOrganization({
        org_name: formData.org_name,
        description: formData.description,
        unique_name: formData.unique_name,
      });
      toast.success("Informações atualizadas com sucesso");
      setIsEditingInfo(false);
    } catch (error) {
      toast.error("Erro ao atualizar informações");
    }
  };

  const handleUpdateImage = async (url: string) => {
    if (!editingImage) return;

    try {
      await updateOrganization({
        [editingImage === "logo" ? "logo_url" : "banner_url"]: url,
      });
      toast.success(`${editingImage === "logo" ? "Logo" : "Banner"} atualizado com sucesso`);
      setEditingImage(null);
    } catch (error) {
      toast.error("Erro ao atualizar imagem");
    }
  };

  const handlePropertyChange = async (
    section: keyof OrganizationProperties,
    key: string | null, // key within the section, or null if the section is a direct value
    value: any
  ) => {
    if (!organization) return;

    const currentProps = { ...organization.properties };
    let newProps = { ...currentProps };

    if (key && typeof newProps[section] === "object") {
      // Nested update (e.g. features.aiAgent)
      newProps = {
        ...newProps,
        [section]: {
          ...((newProps[section] as object) || {}),
          [key]: value,
        },
      };
    } else {
      // Direct update (e.g. theme)
      newProps = {
        ...newProps,
        [section]: value,
      };
    }

    // Optimistic UI update
    setLocalProps(newProps);

    try {
      await updateProperties(newProps);
      toast.success("Configuração salva");
    } catch (error) {
      // Revert on error
      setLocalProps(currentProps);
      toast.error("Erro ao salvar configuração");
    }
  };

  const handleDeleteOrganization = async () => {
    if (
      !confirm(
        "Tem certeza absoluta? Esta ação não pode ser desfeita imediatamente (embora exista restauração por 30 dias)."
      )
    )
      return;

    setIsDeleting(true);
    try {
      const success = await deleteOrganization();
      if (success) {
        toast.success("Organização deletada");
        // Redirect or show deleted state
        router.refresh();
      } else {
        toast.error("Falha ao deletar organização");
      }
    } catch (error) {
      toast.error("Erro ao deletar organização");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreOrganization = async () => {
    try {
      await restoreOrganization();
      toast.success("Organização restaurada com sucesso!");
    } catch (error) {
      toast.error("Erro ao restaurar organização");
    }
  };

  // --- CREATE SCREEN ---
  if (!hasOrganization && !organization?.deleted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md bg-zinc-50 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <Building2 className="h-10 w-10 text-zinc-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Bem-vindo ao Weave
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-zinc-500">
            Crie sua primeira organização para começar a gerenciar projetos e colaborar com sua
            equipe.
          </p>
          <button
            onClick={handleCreateOrganization}
            disabled={isCreating}
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-lg disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isCreating ? (
              <Activity className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar Organização
          </button>
        </div>
      </div>
    );
  }

  // --- DELETED STATE ---
  if (organization?.deleted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/20">
          <Trash2 className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Organização Deletada</h1>
        <p className="mt-2 text-zinc-500">
          Esta organização está marcada para exclusão definitiva em 30 dias.
        </p>
        <button
          onClick={handleRestoreOrganization}
          className="mt-6 flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          <RefreshCw className="h-4 w-4" /> Restaurar Organização
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in animate-in mx-auto space-y-2 duration-500">
      <OrganizationOverview
        organization={organization}
        stats={stats}
        userIsOwner={userIsOwner}
        setEditingImage={setEditingImage}
        setIsEditingInfo={setIsEditingInfo}
        isEditingInfo={isEditingInfo}
        handleUpdateInfo={handleUpdateInfo}
        formData={formData}
        setFormData={setFormData}
      />

      {/* Single Column Layout */}
      <div>
        <SettingsForm
          localProps={localProps}
          organization={organization}
          stats={stats}
          userIsOwner={userIsOwner}
          handlePropertyChange={handlePropertyChange}
          handleDeleteOrganization={handleDeleteOrganization}
          isDeleting={isDeleting}
        />
      </div>

      <ImageEditModal
        isOpen={!!editingImage}
        title={editingImage === "logo" ? "Editar Logo" : "Editar Banner"}
        currentUrl={
          editingImage === "logo" ? organization?.logo_url || "" : organization?.banner_url || ""
        }
        onClose={() => setEditingImage(null)}
        onSave={handleUpdateImage}
        loading={loading}
      />
    </div>
  );
};

export default OrganizationPage;
