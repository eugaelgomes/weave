import React from "react";
import { type Organization, type OrganizationProperties } from "@/app/_services/organization";
import { type OrganizationStats } from "@/app/_contexts/organization-context";
import { Settings, Bell, Layers, ShieldAlert, MapPin } from "lucide-react";
import { useLanguage } from "@/app/_contexts/language-context";
import { Toggle, Select } from "./form-primitives";
import { type OnDirectPropertyChange, type OnNestedPropertyChange } from "./settings-types";

interface SettingsFormProps {
  localProps: OrganizationProperties;
  userIsOwner: boolean;
  handleDirectPropertyChange: OnDirectPropertyChange;
  handleNestedPropertyChange: OnNestedPropertyChange;
  handleDeleteOrganization: () => void;
  isDeleting: boolean;
  organization: Organization | null;
  stats: OrganizationStats;
}

export function SettingsForm({
  localProps,
  userIsOwner,
  handleDirectPropertyChange,
  handleNestedPropertyChange,
  handleDeleteOrganization,
  isDeleting,
  organization,
}: SettingsFormProps) {
  const { t } = useLanguage();
  const address = organization?.address as
    | {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
      }
    | undefined;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <section className="dark:border-surface-dark-border dark:shadow-surface-dark-sm h-full rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:bg-[#1d1d1b]">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <Settings className="h-5 w-5 text-neutral-500" />
            {t.organizationGeneral.settingsSectionTitle}
          </h2>

          <div className="space-y-4">
            <Select
              label={t.organizationGeneral.defaultLanguage}
              value={localProps.language || "pt-BR"}
              onChange={(value) => handleDirectPropertyChange("language", value)}
              options={[
                { label: "Português (Brasil)", value: "pt-BR" },
                { label: "Inglês (US)", value: "en-US" },
                { label: "Español", value: "es" },
              ]}
              disabled={!userIsOwner}
            />
            <Select
              label={t.organizationGeneral.timezone}
              value={localProps.timezone || "America/Sao_Paulo"}
              onChange={(value) => handleDirectPropertyChange("timezone", value)}
              options={[
                { label: "Brasília (GMT-3)", value: "America/Sao_Paulo" },
                { label: "UTC", value: "UTC" },
                { label: "New York (EST)", value: "America/New_York" },
              ]}
              disabled={!userIsOwner}
            />
            <div className="pt-2">
              <Toggle
                label={t.organizationGeneral.allowPublicNotes}
                description={t.organizationGeneral.allowPublicNotesHint}
                checked={localProps?.allowPublicNotes || false}
                onChange={(checked) => handleDirectPropertyChange("allowPublicNotes", checked)}
                disabled={!userIsOwner}
              />
            </div>
          </div>
        </section>

        <section className="dark:border-surface-dark-border dark:shadow-surface-dark-sm h-full rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:bg-[#1d1d1b]">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <MapPin className="h-5 w-5 text-neutral-500" />
            {t.organizationGeneral.locationSectionTitle}
          </h2>
          <div className="space-y-4 text-xs text-neutral-500">
            {address ? (
              <>
                <div className="dark:border-surface-dark-border-strong flex justify-between border-b border-neutral-100 py-2">
                  <span>{t.organizationGeneral.addressLabel}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.street || "-"}
                  </span>
                </div>
                <div className="dark:border-surface-dark-border-strong flex justify-between border-b border-neutral-100 py-2">
                  <span>{t.organizationGeneral.cityStateLabel}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.city ? `${address.city}, ${address.state}` : "-"}
                  </span>
                </div>
                <div className="dark:border-surface-dark-border-strong flex justify-between border-b border-neutral-100 py-2">
                  <span>{t.organizationGeneral.countryLabel}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.country || "-"}
                  </span>
                </div>
              </>
            ) : (
              <p className="italic">{t.organizationGeneral.noAddress}</p>
            )}
            <div className="mt-4 rounded-md bg-neutral-50 p-3 text-xs dark:bg-[#1d1d1b]">
              {t.organizationGeneral.addressBillingHint}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="dark:border-surface-dark-border dark:shadow-surface-dark-sm h-full rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:bg-[#1d1d1b]">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <Layers className="h-5 w-5 text-neutral-500" />
            {t.organizationGeneral.featuresSectionTitle}
          </h2>
          <div className="space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800">
            <Toggle
              label={t.organizationGeneral.featureAiAgent}
              description={t.organizationGeneral.featureAiAgentHint}
              checked={localProps?.features?.aiAgent || false}
              onChange={(checked) => handleNestedPropertyChange("features", "aiAgent", checked)}
              disabled={!userIsOwner}
            />
            <Toggle
              label={t.organizationGeneral.featureBackup}
              description={t.organizationGeneral.featureBackupHint}
              checked={localProps?.features?.backup || false}
              onChange={(checked) => handleNestedPropertyChange("features", "backup", checked)}
              disabled={!userIsOwner}
            />
            <Toggle
              label={t.organizationGeneral.featureCollaboration}
              description={t.organizationGeneral.featureCollaborationHint}
              checked={localProps?.features?.collaboration || false}
              onChange={(checked) =>
                handleNestedPropertyChange("features", "collaboration", checked)
              }
              disabled={!userIsOwner}
            />
          </div>
        </section>

        <section className="dark:border-surface-dark-border dark:shadow-surface-dark-sm h-full rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:bg-[#1d1d1b]">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <Bell className="h-5 w-5 text-neutral-500" />
            {t.organizationGeneral.notificationsSectionTitle}
          </h2>
          <div className="space-y-4">
            <div className="space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800">
              <Toggle
                label={t.organizationGeneral.notificationEmail}
                checked={localProps?.notifications?.email || false}
                onChange={(checked) =>
                  handleNestedPropertyChange("notifications", "email", checked)
                }
                disabled={!userIsOwner}
              />
              <Toggle
                label={t.organizationGeneral.notificationPush}
                checked={localProps?.notifications?.push || false}
                onChange={(checked) => handleNestedPropertyChange("notifications", "push", checked)}
                disabled={!userIsOwner}
              />
            </div>
            <div className="pt-2">
              <Select
                label={t.organizationGeneral.digestFrequency}
                value={localProps?.notifications?.digest || "weekly"}
                onChange={(value) => handleNestedPropertyChange("notifications", "digest", value)}
                options={[
                  { label: t.organizationGeneral.digestDaily, value: "daily" },
                  { label: t.organizationGeneral.digestWeekly, value: "weekly" },
                  { label: t.organizationGeneral.digestMonthly, value: "monthly" },
                ]}
                disabled={!userIsOwner}
              />
            </div>
          </div>
        </section>
      </div>

      {userIsOwner ? (
        <section className="rounded-md border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-950/10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-red-900 dark:text-red-100">
            <ShieldAlert className="h-5 w-5" />
            {t.organizationGeneral.dangerZoneTitle}
          </h2>
          <p className="mb-6 text-xs text-red-700 dark:text-red-300">
            {t.organizationGeneral.dangerZoneHint}
          </p>

          <div className="flex items-center justify-between rounded-md border border-red-200 bg-white p-4 dark:border-red-900/30 dark:bg-[#1d1d1b]">
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {t.organizationGeneral.deleteOrgTitle}
              </h4>
              <p className="text-[11px] text-neutral-500">{t.organizationGeneral.deleteOrgHint}</p>
            </div>
            <button
              type="button"
              onClick={handleDeleteOrganization}
              disabled={isDeleting}
              className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? t.organizationGeneral.deleting : t.organizationGeneral.deleteOrgButton}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
