"use client";

import React from "react";
import { Building2, Trash2, RefreshCw, Plus, Activity } from "lucide-react";

// Internal Components
import getStorageUrl from "@/app/_utils/get-storage-url";
import { OrganizationImageEditModal } from "./_components/organization-image-edit-modal";
import { SettingsForm } from "./_components/settings-form";
import { WorkspaceOverview } from "./_components/header";
import { WorkspaceHeader } from "../../_components/ui/headers/workspace-header";
import { useOrganizationSettingsPage } from "./_hooks/use-organization-settings-page";

const WorkspacePage = () => {
  const {
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
  } = useOrganizationSettingsPage();

  if (!hasOrganization && !organization?.deleted) {
    return (
      <div className="animate-in fade-in flex min-h-0 flex-1 w-full flex-col bg-neutral-50 duration-200 dark:bg-[#1d1d1b]">
        <WorkspaceHeader />
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto py-2">
          <div className="w-full max-w-md rounded-md border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md bg-neutral-50 shadow-sm ring-1 ring-neutral-200 dark:bg-[#1d1d1b] dark:ring-surface-dark-border-strong">
              <Building2 className="h-10 w-10 text-neutral-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Bem-vindo ao Weave
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-neutral-600 dark:text-neutral-400">
              Crie seu primeiro workspace para começar a gerenciar projetos e colaborar com sua
              equipe.
            </p>
            <button
              type="button"
              onClick={handleCreateOrganization}
              disabled={isCreating}
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-brand-primary-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-yellow-600 hover:shadow-lg disabled:opacity-70 dark:hover:bg-yellow-600"
            >
              {isCreating ? (
                <Activity className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Criar Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (organization?.deleted) {
    return (
      <div className="animate-in fade-in flex min-h-0 flex-1 w-full flex-col bg-neutral-50 duration-200 dark:bg-[#1d1d1b]">
        <WorkspaceHeader />
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto py-2">
          <div className="w-full max-w-md rounded-md border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/20">
              <Trash2 className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              Organização Excluída
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              Esta organização está marcada para exclusão definitiva em 30 dias.
            </p>
            <button
              type="button"
              onClick={handleRestoreOrganization}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-brand-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 dark:hover:bg-yellow-600"
            >
              <RefreshCw className="h-4 w-4" /> Restaurar Organização
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 w-full flex-col bg-neutral-50 dark:bg-[#1d1d1b]">
      <WorkspaceHeader />

      <div className="fade-in animate-in min-h-0 w-full min-w-0 flex-1 space-y-2 overflow-y-auto py-2 duration-500">
        <WorkspaceOverview
          workspace={organization}
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
            handleDirectPropertyChange={handleDirectPropertyChange}
            handleNestedPropertyChange={handleNestedPropertyChange}
            handleDeleteOrganization={handleDeleteOrganization}
            isDeleting={isDeleting}
          />
        </div>

        <OrganizationImageEditModal
          isOpen={!!editingImage}
          title={editingImage === "logo" ? "Editar Logo" : "Editar Banner"}
          currentUrl={
            editingImage === "logo"
              ? getStorageUrl(organization?.logo_url || "")
              : getStorageUrl(organization?.banner_url || "")
          }
          onClose={() => setEditingImage(null)}
          onSave={handleUpdateImage}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default WorkspacePage;
