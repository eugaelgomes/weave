"use client";

import React from "react";
import { Building2, Trash2, RefreshCw, Plus, Activity } from "lucide-react";
import getStorageUrl from "@/app/_utils/get-storage-url";
import { useLanguage } from "@/app/_contexts/language-context";
import { WorkspacePageShell } from "@/app/(protected)/[orgId]/organization/_components/workspace-page-shell";
import { OrganizationImageEditModal } from "@/app/(protected)/[orgId]/organization/general/_components/organization-image-edit-modal";
import { SettingsForm } from "@/app/(protected)/[orgId]/organization/general/_components/settings-form";
import { WorkspaceOverview } from "@/app/(protected)/[orgId]/organization/general/_components/header";
import { useOrganizationSettingsPage } from "@/app/(protected)/[orgId]/organization/general/_hooks/use-organization-settings-page";

const WorkspacePage = () => {
  const { t } = useLanguage();
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
      <WorkspacePageShell description={t.organizationGeneral.description}>
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center py-4">
          <div className="dark:border-surface-dark-border dark:shadow-surface-dark-sm w-full max-w-md rounded-md border border-neutral-200 bg-white p-8 text-center shadow-sm dark:bg-[#1d1d1b]">
            <div className="dark:ring-surface-dark-border-strong mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md bg-neutral-50 shadow-sm ring-1 ring-neutral-200 dark:bg-[#1d1d1b]">
              <Building2 className="h-10 w-10 text-neutral-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {t.organizationGeneral.emptyTitle}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-neutral-600 dark:text-neutral-400">
              {t.organizationGeneral.emptyBody}
            </p>
            <button
              type="button"
              onClick={handleCreateOrganization}
              disabled={isCreating}
              className="bg-brand-primary-500 mt-8 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-yellow-600 hover:shadow-lg disabled:opacity-70 dark:hover:bg-yellow-600"
            >
              {isCreating ? (
                <Activity className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {t.organizationGeneral.createWorkspace}
            </button>
          </div>
        </div>
      </WorkspacePageShell>
    );
  }

  if (organization?.deleted) {
    return (
      <WorkspacePageShell description={t.organizationGeneral.description}>
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center py-4">
          <div className="dark:border-surface-dark-border dark:shadow-surface-dark-sm w-full max-w-md rounded-md border border-neutral-200 bg-white p-8 text-center shadow-sm dark:bg-[#1d1d1b]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md bg-red-100 dark:bg-red-900/20">
              <Trash2 className="h-10 w-10 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {t.organizationGeneral.deletedTitle}
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-400">
              {t.organizationGeneral.deletedBody}
            </p>
            <button
              type="button"
              onClick={handleRestoreOrganization}
              className="bg-brand-primary-500 mt-6 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 dark:hover:bg-yellow-600"
            >
              <RefreshCw className="h-4 w-4" /> {t.organizationGeneral.restoreOrganization}
            </button>
          </div>
        </div>
      </WorkspacePageShell>
    );
  }

  return (
    <WorkspacePageShell description={t.organizationGeneral.description}>
      <div className="fade-in animate-in min-h-0 w-full min-w-0 flex-1 space-y-2 duration-500">
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
    </WorkspacePageShell>
  );
};

export default WorkspacePage;
