import React from "react";
import {
  type Organization,
  type OrganizationProperties,
} from "@/app/_services/organization";
import { type OrganizationStats } from "@/app/_contexts/organization-context";
import {
  Settings,
  Bell,
  Layers,
  ShieldAlert,
  CreditCard,
  MapPin,
  Puzzle,
  Zap,
} from "lucide-react";
import { Toggle, Select } from "./form-primitives";
import { DomainsSection } from "./domains-section";
import {
  type OnDirectPropertyChange,
  type OnNestedPropertyChange,
} from "./settings-types";

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
  stats,
}: SettingsFormProps) {
  const currentPlan = organization?.plan_name || "Free";
  const planValue = organization?.plan_value || 0;
  const currency = organization?.currency || "BRL";

  const memberLimit = localProps.maxMembers && localProps.maxMembers > 0 ? localProps.maxMembers : 50;
  const projectLimit =
    localProps.maxProjects && localProps.maxProjects > 0 ? localProps.maxProjects : 100;
  const memberPercent = Math.min((stats.totalMembers / memberLimit) * 100, 100);
  const projectPercent = Math.min((stats.totalProjects / projectLimit) * 100, 100);
  const address = organization?.address as
    | {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
      }
    | undefined;
  const integrations =
    organization?.integrations && typeof organization.integrations === "object"
      ? (organization.integrations as Record<string, unknown>)
      : {};
  const integrationEntries = Object.entries(integrations);

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
        <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <CreditCard className="h-5 w-5 text-neutral-500" />
          Plano & Uso
        </h2>

        <div className="mb-6 rounded-md border border-neutral-100 bg-neutral-50 p-4 dark:border-surface-dark-border-strong dark:bg-[#1d1d1b]/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">
                Plano Atual: {currentPlan}
              </p>
              <p className="text-xs text-neutral-500">
                {planValue > 0
                  ? `${currency} ${planValue.toFixed(2)} / ${organization?.billing_cycle === "monthly" ? "mês" : "ano"}`
                  : "Gratuito para sempre"}
              </p>
            </div>
            {userIsOwner && (
              <button
                disabled
                className="cursor-not-allowed rounded-md bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-500 opacity-70 dark:bg-neutral-800 dark:text-neutral-400"
              >
                Gerenciar Assinatura
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-neutral-600 dark:text-neutral-400">Membros da Organização</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {stats.totalMembers} / {memberLimit}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="bg-brand-primary-500 h-full rounded-full transition-all"
                style={{ width: `${memberPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-neutral-600 dark:text-neutral-400">Projetos Ativos</span>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {stats.totalProjects} / {projectLimit}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="bg-brand-primary-500 h-full rounded-full transition-all"
                style={{ width: `${projectPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid Layout for General & Address */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <section className="h-full rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <Settings className="h-5 w-5 text-neutral-500" />
            Geral
          </h2>

          <div className="space-y-4">
            <Select
              label="Idioma Padrão"
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
              label="Fuso Horário"
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
                label="Permitir Tarefas Públicas"
                description="Habilitar compartilhamento público"
                checked={localProps?.allowPublicNotes || false}
                onChange={(checked) => handleDirectPropertyChange("allowPublicNotes", checked)}
                disabled={!userIsOwner}
              />
            </div>
          </div>
        </section>

        <section className="h-full rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <MapPin className="h-5 w-5 text-neutral-500" />
            Localização
          </h2>
          <div className="space-y-4 text-xs text-neutral-500">
            {address ? (
              <>
                <div className="flex justify-between border-b border-neutral-100 py-2 dark:border-surface-dark-border-strong">
                  <span>Endereço</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.street || "-"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-100 py-2 dark:border-surface-dark-border-strong">
                  <span>Cidade/Estado</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.city
                      ? `${address.city}, ${address.state}`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-neutral-100 py-2 dark:border-surface-dark-border-strong">
                  <span>País</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {address.country || "-"}
                  </span>
                </div>
              </>
            ) : (
              <p className="italic">Nenhum endereço cadastrado.</p>
            )}
            <div className="mt-4 rounded-md bg-neutral-50 p-3 text-xs dark:bg-[#1d1d1b]">
              Endereços são usados para faturamento e podem ser editados na gestão da assinatura.
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="h-full rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <Layers className="h-5 w-5 text-neutral-500" />
            Funcionalidades
          </h2>
          <div className="space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800">
            <Toggle
              label="Assistente de IA"
              description="Recursos de inteligência artificial"
              checked={localProps?.features?.aiAgent || false}
              onChange={(checked) => handleNestedPropertyChange("features", "aiAgent", checked)}
              disabled={!userIsOwner}
            />
            <Toggle
              label="Backup Automático"
              description="Backup diário de tarefas"
              checked={localProps?.features?.backup || false}
              onChange={(checked) => handleNestedPropertyChange("features", "backup", checked)}
              disabled={!userIsOwner}
            />
            <Toggle
              label="Colaboração em tempo real"
              description="Edição simultânea"
              checked={localProps?.features?.collaboration || false}
              onChange={(checked) =>
                handleNestedPropertyChange("features", "collaboration", checked)
              }
              disabled={!userIsOwner}
            />
          </div>
        </section>

        <section className="h-full rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
            <Bell className="h-5 w-5 text-neutral-500" />
            Notificações
          </h2>
          <div className="space-y-4">
            <div className="space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800">
              <Toggle
                label="Emails"
                checked={localProps?.notifications?.email || false}
                onChange={(checked) => handleNestedPropertyChange("notifications", "email", checked)}
                disabled={!userIsOwner}
              />
              <Toggle
                label="Notificações Push"
                checked={localProps?.notifications?.push || false}
                onChange={(checked) => handleNestedPropertyChange("notifications", "push", checked)}
                disabled={!userIsOwner}
              />
            </div>
            <div className="pt-2">
              <Select
                label="Frequência do Resumo"
                value={localProps?.notifications?.digest || "weekly"}
                onChange={(value) => handleNestedPropertyChange("notifications", "digest", value)}
                options={[
                  { label: "Diário", value: "daily" },
                  { label: "Semanal", value: "weekly" },
                  { label: "Mensal", value: "monthly" },
                ]}
                disabled={!userIsOwner}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-md border border-neutral-200 bg-white p-6 shadow-sm dark:border-surface-dark-border dark:bg-[#1d1d1b] dark:shadow-surface-dark-sm">
        <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-neutral-900 dark:text-neutral-100">
          <Puzzle className="h-5 w-5 text-neutral-500" />
          Integrações
        </h2>

        {integrationEntries.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrationEntries.map(([key]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-neutral-100 p-3 dark:border-surface-dark-border"
              >
                <div className="font-medium capitalize">{key}</div>
                <div className="flex items-center gap-2">
                  <span className="sr-only">Integração ativa</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-neutral-200 bg-neutral-50 py-8 text-center dark:border-surface-dark-border dark:bg-[#1d1d1b]/50">
            <Zap className="mb-3 h-8 w-8 text-neutral-300 dark:text-neutral-600" />
            <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
              Nenhuma integração ativa
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              Conecte ferramentas externas para expandir o potencial.
            </p>
          </div>
        )}
      </section>

      <DomainsSection userIsOwner={userIsOwner} />

      {userIsOwner && (
        <section className="rounded-md border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-950/10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-red-900 dark:text-red-100">
            <ShieldAlert className="h-5 w-5" />
            Zona de Perigo
          </h2>
          <p className="mb-6 text-xs text-red-700 dark:text-red-300">
            Ações nesta área podem ser irreversíveis ou causar perda de dados temporária.
          </p>

          <div className="flex items-center justify-between rounded-md border border-red-200 bg-white p-4 dark:border-red-900/30 dark:bg-[#1d1d1b]">
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Deletar Organização
              </h4>
              <p className="text-[11px] text-neutral-500">
                Isso marcará a organização para exclusão em 30 dias.
              </p>
            </div>
            <button
              onClick={handleDeleteOrganization}
              disabled={isDeleting}
              className="rounded-md bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? "Deletando..." : "Deletar"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
