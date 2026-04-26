import React from "react";
import { type OrganizationProperties } from "@/app/_services/organization";
import {
  Settings,
  Bell,
  Layers,
  Palette,
  ShieldAlert,
  CreditCard,
  MapPin,
  Puzzle,
  Zap,
} from "lucide-react";
import { Toggle, Select, Input } from "./ui-elements";
import { DomainsSection } from "./domains-section";

interface SettingsFormProps {
  localProps: OrganizationProperties;
  userIsOwner: boolean;
  handlePropertyChange: (
    section: keyof OrganizationProperties,
    key: string | null,
    value: any
  ) => void;
  handleDeleteOrganization: () => void;
  isDeleting: boolean;
  organization: any;
  stats: any;
}

export function SettingsForm({
  localProps,
  userIsOwner,
  handlePropertyChange,
  handleDeleteOrganization,
  isDeleting,
  organization,
  stats,
}: SettingsFormProps) {
  const currentPlan = organization?.plan_name || "Free";
  const planValue = organization?.plan_value || 0;
  const currency = organization?.currency || "BRL";

  // Calculate percentages for bars
  const memberLimit = localProps.maxMembers || 50;
  const projectLimit = localProps.maxProjects || 100;
  const memberPercent = Math.min((stats.totalMembers / memberLimit) * 100, 100);
  const projectPercent = Math.min((stats.totalProjects / projectLimit) * 100, 100);

  return (
    <div className="space-y-6">
      {/* Plan & Usage Section - New */}
      <section className="rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <CreditCard className="h-5 w-5 text-zinc-500" />
          Plano & Uso
        </h2>

        <div className="mb-6 rounded-md border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-900 dark:bg-zinc-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Plano Atual: {currentPlan}
              </p>
              <p className="text-xs text-zinc-500">
                {planValue > 0
                  ? `${currency} ${planValue.toFixed(2)} / ${organization?.billing_cycle === "monthly" ? "mês" : "ano"}`
                  : "Gratuito para sempre"}
              </p>
            </div>
            {userIsOwner && (
              <button
                disabled
                className="cursor-not-allowed rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                Gerenciar Assinatura
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">Membros da Organização</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.totalMembers} / {memberLimit}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-100"
                style={{ width: `${memberPercent}%` }}
              />
            </div>
          </div>
          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">Projetos Ativos</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats.totalProjects} / {projectLimit}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-100"
                style={{ width: `${projectPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Grid Layout for General & Address */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <section className="h-full rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Settings className="h-5 w-5 text-zinc-500" />
            Geral
          </h2>

          <div className="space-y-4">
            <Select
              label="Idioma Padrão"
              value={localProps.language || "pt-BR"}
              onChange={(v) => handlePropertyChange("language", null, v)}
              options={[
                { label: "Português (Brasil)", value: "pt-BR" },
                { label: "English (US)", value: "en-US" },
                { label: "Español", value: "es" },
              ]}
              disabled={!userIsOwner}
            />
            <Select
              label="Fuso Horário"
              value={localProps.timezone || "America/Sao_Paulo"}
              onChange={(v) => handlePropertyChange("timezone", null, v)}
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
                onChange={(v) => handlePropertyChange("allowPublicNotes", null, v)}
                disabled={!userIsOwner}
              />
            </div>
          </div>
        </section>

        {/* Address & Location (Placeholder for now as Address is complex usually) */}
        <section className="h-full rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <MapPin className="h-5 w-5 text-zinc-500" />
            Localização
          </h2>
          {/* Currently read-only or placeholder as we don't have update logic per field in this form yet */}
          <div className="space-y-4 text-xs text-zinc-500">
            {organization?.address ? (
              <>
                <div className="flex justify-between border-b border-zinc-100 py-2 dark:border-zinc-900">
                  <span>Endereço</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {organization.address.street || "-"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 py-2 dark:border-zinc-900">
                  <span>Cidade/Estado</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {organization.address.city
                      ? `${organization.address.city}, ${organization.address.state}`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 py-2 dark:border-zinc-900">
                  <span>País</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {organization.address.country || "-"}
                  </span>
                </div>
              </>
            ) : (
              <p className="italic">Nenhum endereço cadastrado.</p>
            )}
            <div className="mt-4 rounded-md bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
              Endereços são usados para faturamento e podem ser editados na gestão da assinatura.
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Features */}
        <section className="h-full rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Layers className="h-5 w-5 text-zinc-500" />
            Funcionalidades
          </h2>
          <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-900">
            <Toggle
              label="Assistente de IA"
              description="Recursos de inteligência artificial"
              checked={localProps?.features?.aiAgent || false}
              onChange={(v) => handlePropertyChange("features", "aiAgent", v)}
              disabled={!userIsOwner}
            />
            <Toggle
              label="Backup Automático"
              description="Backup diário de tarefas"
              checked={localProps?.features?.backup || false}
              onChange={(v) => handlePropertyChange("features", "backup", v)}
              disabled={!userIsOwner}
            />
            <Toggle
              label="Colaboração Real-time"
              description="Edição simultânea"
              checked={localProps?.features?.collaboration || false}
              onChange={(v) => handlePropertyChange("features", "collaboration", v)}
              disabled={!userIsOwner}
            />
          </div>
        </section>

        {/* Notifications */}
        <section className="h-full rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Bell className="h-5 w-5 text-zinc-500" />
            Notificações
          </h2>
          <div className="space-y-4">
            <div className="space-y-2 divide-y divide-zinc-100 dark:divide-zinc-900">
              <Toggle
                label="Emails"
                checked={localProps?.notifications?.email || false}
                onChange={(v) => handlePropertyChange("notifications", "email", v)}
                disabled={!userIsOwner}
              />
              <Toggle
                label="Push Notifications"
                checked={localProps?.notifications?.push || false}
                onChange={(v) => handlePropertyChange("notifications", "push", v)}
                disabled={!userIsOwner}
              />
            </div>
            <div className="pt-2">
              <Select
                label="Frequência do Resumo"
                value={localProps?.notifications?.digest || "weekly"}
                onChange={(v) => handlePropertyChange("notifications", "digest", v)}
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

      {/* Integrations (New Placeholder) */}
      <section className="rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <Puzzle className="h-5 w-5 text-zinc-500" />
          Integrações
        </h2>

        {organization?.integrations && Object.keys(organization.integrations).length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(organization.integrations).map(([key, value]: [string, any]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div className="font-medium capitalize">{key}</div>
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-zinc-200 bg-zinc-50 py-8 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
            <Zap className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              Nenhuma integração ativa
            </p>
            <p className="mt-1 text-[11px] text-zinc-500">
              Conecte ferramentas externas para expandir o potencial.
            </p>
          </div>
        )}
      </section>

      {/* Domains Section */}
      <DomainsSection userIsOwner={userIsOwner} />

      {/* Branding */}
      <section className="rounded-md border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          <Palette className="h-5 w-5 text-zinc-500" />
          Identidade Visual
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Cores da Marca</label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex gap-2">
                <input
                  type="color"
                  value={localProps?.branding?.primaryColor || "#000000"}
                  onChange={(e) => handlePropertyChange("branding", "primaryColor", e.target.value)}
                  disabled={!userIsOwner}
                  className="h-10 w-10 cursor-pointer rounded border border-zinc-200 p-1 dark:border-zinc-800 dark:bg-zinc-900"
                />
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] text-zinc-500 uppercase">Primária</span>
                  <span className="font-mono text-xs">
                    {localProps?.branding?.primaryColor || "#000000"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={localProps?.branding?.secondaryColor || "#ffffff"}
                  onChange={(e) =>
                    handlePropertyChange("branding", "secondaryColor", e.target.value)
                  }
                  disabled={!userIsOwner}
                  className="h-10 w-10 cursor-pointer rounded border border-zinc-200 p-1 dark:border-zinc-800 dark:bg-zinc-900"
                />
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] text-zinc-500 uppercase">Secundária</span>
                  <span className="font-mono text-xs">
                    {localProps?.branding?.secondaryColor || "#ffffff"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Input
              label="Domínio Personalizado (CNAME)"
              value={localProps?.branding?.customDomain || ""}
              onChange={(v) => handlePropertyChange("branding", "customDomain", v)}
              placeholder="docs.example.com"
              disabled={!userIsOwner}
            />
            <p className="mt-1.5 text-[10px] text-zinc-400">
              Requer configuração DNS. A propagação pode levar até 24h.
            </p>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      {userIsOwner && (
        <section className="rounded-md border border-red-200 bg-red-50 p-6 dark:border-red-900/30 dark:bg-red-950/10">
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-red-900 dark:text-red-100">
            <ShieldAlert className="h-5 w-5" />
            Zona de Perigo
          </h2>
          <p className="mb-6 text-xs text-red-700 dark:text-red-300">
            Ações nesta área podem ser irreversíveis ou causar perda de dados temporária.
          </p>

          <div className="flex items-center justify-between rounded-md border border-red-200 bg-white p-4 dark:border-red-900/30 dark:bg-zinc-900">
            <div>
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Deletar Organização
              </h4>
              <p className="text-[11px] text-zinc-500">
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
