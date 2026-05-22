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
        <section className="space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:border-surface-dark-border-muted dark:bg-[#1d1d1b]/20">
          <h2 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2">
            <Settings size={12} className="text-amber-500" />
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

        <section className="space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:border-surface-dark-border-muted dark:bg-[#1d1d1b]/20">
          <h2 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2">
            <MapPin size={12} className="text-amber-500" />
            {t.organizationGeneral.locationSectionTitle}
          </h2>
          <div className="space-y-3 text-[11px] text-neutral-500">
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
            <div className="mt-3 rounded-md bg-neutral-100/50 p-2.5 text-[10px] dark:bg-[#1d1d1b]/50">
              {t.organizationGeneral.addressBillingHint}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:border-surface-dark-border-muted dark:bg-[#1d1d1b]/20">
          <h2 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2">
            <Layers size={12} className="text-amber-500" />
            {t.organizationGeneral.featuresSectionTitle}
          </h2>
          <div className="space-y-1 divide-y divide-neutral-100/50 dark:divide-neutral-800/50">
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

        <section className="space-y-3 rounded-md border border-neutral-100 bg-neutral-50/30 p-4 dark:border-surface-dark-border-muted dark:bg-[#1d1d1b]/20">
          <h2 className="text-[10px] font-bold tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mb-2">
            <Bell size={12} className="text-amber-500" />
            {t.organizationGeneral.notificationsSectionTitle}
          </h2>
          <div className="space-y-3">
            <div className="space-y-1 divide-y divide-neutral-100/50 dark:divide-neutral-800/50">
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
        <section className="space-y-3 rounded-md border border-red-100 bg-red-50/20 p-4 dark:border-red-900/20 dark:bg-red-950/10">
          <div className="mb-2">
            <h2 className="text-[10px] font-bold tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-1">
              <ShieldAlert size={12} />
              {t.organizationGeneral.dangerZoneTitle}
            </h2>
            <p className="text-[11px] text-red-500/80 dark:text-red-400/80">
              {t.organizationGeneral.dangerZoneHint}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border border-red-200/50 bg-white/50 p-3 dark:border-red-900/30 dark:bg-[#1d1d1b]/50">
            <div>
              <h4 className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
                {t.organizationGeneral.deleteOrgTitle}
              </h4>
              <p className="text-[10px] text-neutral-500">{t.organizationGeneral.deleteOrgHint}</p>
            </div>
            <button
              type="button"
              onClick={handleDeleteOrganization}
              disabled={isDeleting}
              className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? t.organizationGeneral.deleting : t.organizationGeneral.deleteOrgButton}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
