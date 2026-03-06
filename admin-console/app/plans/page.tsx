"use client";

import React, { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/app/contexts/AuthContext";
import { usePlans } from "@/app/contexts/plansContext";
import {
  FaSearch,
  FaSpinner,
  FaRobot,
  FaCheckCircle,
  FaTimesCircle,
  FaChevronDown,
  FaChevronUp,
  FaHdd,
  FaFileExport,
  FaUsers,
  FaCogs,
  FaStar,
} from "react-icons/fa";
import { formatCurrency } from "@/app/utils/formatters";

const StatusBadge = ({ active }: { active: boolean }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
      active
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
        : "bg-neutral-50 text-neutral-600 ring-1 ring-inset ring-neutral-500/20"
    }`}
  >
    {active ? (
      <>
        <FaCheckCircle className="h-3 w-3 text-emerald-500" /> Ativo
      </>
    ) : (
      <>
        <FaTimesCircle className="h-3 w-3 text-neutral-400" /> Inativo
      </>
    )}
  </span>
);

const FeatureTag = ({ label, enabled }: { label: string; enabled: boolean }) => (
  <div
    className={`flex items-center gap-2 text-sm ${
      enabled ? "text-neutral-700" : "text-neutral-400 line-through"
    }`}
  >
    {enabled ? (
      <FaCheckCircle className="h-4 w-4 text-emerald-500" />
    ) : (
      <FaTimesCircle className="h-4 w-4 text-neutral-300" />
    )}
    {label}
  </div>
);

export default function PlansPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { plans, isLoading: loading, error } = usePlans();
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "standard" | "personalized">("all");

  const toggleExpand = (id: string) => {
    setExpandedPlanId((prevId) => (prevId === id ? null : id));
  };

  const filteredPlans = plans.filter((plan) => {
    const matchSearch = plan.name.toLowerCase().includes(search.toLowerCase());

    const isActive = !!plan.is_active;
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? isActive
        : !isActive;

    const isPersonalized = !!plan.personalized_for_client;
    const matchType =
      typeFilter === "all"
        ? true
        : typeFilter === "personalized"
        ? isPersonalized
        : !isPersonalized;

    return matchSearch && matchStatus && matchType;
  });

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm font-medium text-neutral-500">
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col rounded-md border border-neutral-200 bg-white p-3">
        <div>
          <h1 className="text-md font-semibold tracking-tight text-neutral-900">
            Planos Weave
          </h1>
          <p className="text-xs text-neutral-500">
            Gerenciamento e detalhes de planos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-4 border-b border-neutral-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <FaSearch className="h-4 w-4 text-neutral-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar plano por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-md border border-neutral-200 bg-white py-2 pl-10 pr-3 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-400 focus:outline-none focus:ring-4 focus:ring-neutral-100/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Status
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 outline-none transition-all hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>

          <div className="flex items-center gap-2 border-l border-neutral-200 pl-3">
            <label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Tipo
            </label>
            <select
              id="type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 outline-none transition-all hover:border-neutral-300 focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100"
            >
              <option value="all">Todos</option>
              <option value="standard">Padrão</option>
              <option value="personalized">Personalizados</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-6 py-4 font-medium">Plano</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 text-center font-medium">Uso (User/Org)</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 text-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <FaSpinner className="mx-auto h-6 w-6 animate-spin text-neutral-400" />
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-500">
                    Nenhum plano encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => {
                  // Agora usando planId
                  const isExpanded = expandedPlanId === plan.planId;

                  return (
                    <React.Fragment key={plan.planId}>
                      <tr
                        className={`cursor-pointer transition-colors hover:bg-neutral-50 ${
                          isExpanded ? "bg-neutral-50" : ""
                        }`}
                        onClick={() => toggleExpand(plan.planId as string)}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-900">{plan.name}</span>
                            {plan.personalized_for_client && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                <FaStar className="h-2.5 w-2.5 text-yellow-500" /> Personalizado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium text-neutral-900">
                            {formatCurrency(plan.plan_value, plan.currency)}
                          </span>
                          <span className="text-neutral-500 ml-1">/{plan.billing_cycle}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-4 text-neutral-600">
                            <div className="flex items-center gap-1.5" title="Usuários Ativos">
                              <FaUsers className="text-indigo-500" />
                              <span className="font-medium">{plan.user_count}</span>
                            </div>
                            <div className="flex items-center gap-1.5" title="Organizações">
                              <FaCogs className="text-slate-500" />
                              <span className="font-medium">{plan.org_count}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge active={!!plan.is_active} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isExpanded ? (
                            <FaChevronUp className="h-4 w-4 text-neutral-500 inline-block" />
                          ) : (
                            <FaChevronDown className="h-4 w-4 text-neutral-400 inline-block" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/plans/edit/${plan.planId}`}
                            className="text-sm font-semibold text-neutral-500 hover:text-yellow-600 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Editar
                          </Link>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-neutral-50 border-b border-neutral-200">
                          <td colSpan={6} className="p-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                              
                              {/* Card de Infraestrutura */}
                              <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                                  <FaHdd className="h-4 w-4 text-blue-500" />
                                  Infraestrutura & Limites
                                </h4>
                                <div className="space-y-3 text-sm text-neutral-600">
                                  <div className="flex justify-between items-center">
                                    <span>Máximo de Notas</span>
                                    <strong className="text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">{plan.details?.limits?.max_notes}</strong>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>Upload Mensal</span>
                                    <strong className="text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">{plan.details?.limits?.storage?.total_monthly_upload_mb} MB</strong>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span>Tamanho Máx. por Arquivo</span>
                                    <strong className="text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">{plan.details?.limits?.storage?.max_file_size_mb} MB</strong>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-neutral-100">
                                    <span className="flex items-center gap-1.5">
                                      <FaFileExport className="text-orange-500" /> Backups Mensais
                                    </span>
                                    <strong className="text-neutral-900">{plan.details?.limits?.exports?.backups_monthly}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Card de Weave AI */}
                              <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                                  <FaRobot className="h-4 w-4 text-purple-500" />
                                  Weave AI
                                </h4>
                                <div className="space-y-4 text-sm text-neutral-600">
                                  <div className="flex flex-wrap gap-2">
                                    {plan.details?.weave_ai?.features?.map((f) => (
                                      <span
                                        key={f}
                                        className="rounded-md bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 border border-purple-100 uppercase tracking-wide"
                                      >
                                        {f}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="space-y-3 pt-2">
                                    <div className="flex justify-between items-center">
                                      <span>Modelo Padrão</span>
                                      <strong className="text-neutral-900">{plan.details?.weave_ai?.config?.default_model}</strong>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span>Mensagens/Mês</span>
                                      <strong className="text-neutral-900">{plan.details?.weave_ai?.config?.monthly_messages}</strong>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Card de Features */}
                              <div className="rounded-md border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
                                <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 border-b border-neutral-100 pb-3">
                                  <FaStar className="h-4 w-4 text-yellow-500" />
                                  Features do Tier
                                </h4>
                                <div className="space-y-3">
                                  <FeatureTag label="Dark Mode" enabled={!!plan.details?.features?.dark_mode} />
                                  <FeatureTag label="Ferramentas de Colaboração" enabled={!!plan.details?.features?.collaboration_tools} />
                                  <FeatureTag label="Branding Personalizado" enabled={!!plan.details?.features?.custom_branding} />
                                  <FeatureTag label="Suporte Prioritário" enabled={!!plan.details?.features?.priority_support} />
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}