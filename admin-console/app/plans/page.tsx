"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import { listPlans, type Plan } from "@/app/services/api";
import { FaSearch, FaSpinner, FaRobot, FaCheckCircle, FaTimesCircle } from "react-icons/fa";


export default function PlansPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlans();
    }
  }, [isAuthenticated]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await listPlans();
      // Ajuste aqui para garantir que estamos acessando a propriedade 'plans' do retorno
      setPlans(data.plans || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  // Filtro client-side simples para a busca
  const filteredPlans = plans.filter(plan => 
    plan.name.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center font-medium">Carregando autenticação...</div>;
  }

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Planos de Assinatura</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gerencie os tiers, limites e precificação do ecossistema.
        </p>
      </div>

      {/* Search & Actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar plano por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-500">Plano</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-500">Valor</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-500">Limites (Notas/Membros)</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-500">Weave AI</th>
              <th className="px-4 py-3 text-xs font-semibold uppercase text-neutral-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <FaSpinner className="mx-auto h-8 w-8 animate-spin text-yellow-500" />
                </td>
              </tr>
            ) : filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-neutral-500">
                  Nenhum plano encontrado.
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => (
                <tr key={plan.plan_id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="font-bold text-neutral-900">{plan.name}</div>
                    <div className="text-xs text-neutral-400">ID: {plan.plan_id.split('-')[0]}...</div>
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <span className="font-semibold text-neutral-700">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: plan.currency }).format(plan.plan_value)}
                    </span>
                    <span className="text-xs text-neutral-500 ml-1">/{plan.billing_cycle}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-600">
                    <div className="flex flex-col">
                      <span>Max Notas: <strong>{plan.details.limits.max_notes}</strong></span>
                      <span>Membros: <strong>{plan.details.limits.max_team_members}</strong></span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {plan.details.weave_ai.enabled ? (
                      <div className="flex items-center gap-2 text-blue-600">
                        <FaRobot className="h-4 w-4" />
                        <span className="text-xs font-medium">{plan.details.weave_ai.config.monthly_messages} msg/mês</span>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic">Desativado</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      plan.is_active 
                        ? "bg-green-100 text-green-700" 
                        : "bg-neutral-100 text-neutral-500"
                    }`}>
                      {plan.is_active ? (
                        <>
                          <FaCheckCircle className="h-3 w-3" /> Ativo
                        </>
                      ) : (
                        <>
                          <FaTimesCircle className="h-3 w-3" /> Inativo
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}