"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/app/components/Badge";
import { listPlans, type Plan } from "@/app/services/api";

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listPlans()
      .then((data) => setPlans(data.plans))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency || "BRL",
    }).format(value);
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualizar planos disponíveis
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-48 animate-pulse rounded-xl border border-border bg-card"
                />
              ))
            : plans.map((plan) => (
                <div
                  key={plan.plan_id}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={plan.is_active ? "success" : "destructive"}
                    >
                      {plan.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <p className="text-2xl font-bold text-foreground">
                      {formatCurrency(plan.plan_value, plan.currency)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.billing_cycle === "monthly" ? "mês" : plan.billing_cycle}
                      </span>
                    </p>
                  </div>

                  <div className="mt-4 flex gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Usuários</p>
                      <p className="text-sm font-semibold text-foreground">
                        {plan.user_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Organizações
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {plan.org_count}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
        </div>

        {!loading && plans.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum plano encontrado
          </div>
        )}
      </div>
    </>
  );
}
