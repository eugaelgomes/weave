"use client";

import { useEffect, useState } from "react";
import { ConsoleLayout } from "@/app/components/ConsoleLayout";
import { StatCard } from "@/app/components/StatCard";
import { getDashboard, type DashboardStats } from "@/app/services/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <ConsoleLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral do sistema
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {stats && (
          <>
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Usuários
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total de Usuários" value={stats.total_users} />
                <StatCard
                  title="Verificados"
                  value={stats.verified_users}
                />
                <StatCard
                  title="Deletados"
                  value={stats.deleted_users}
                />
                <StatCard
                  title="Novos (30 dias)"
                  value={stats.new_users_30d}
                />
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Sistema
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="Organizações"
                  value={stats.total_organizations}
                />
                <StatCard
                  title="Novas Orgs (30 dias)"
                  value={stats.new_orgs_30d}
                />
                <StatCard title="Projetos" value={stats.total_projects} />
                <StatCard title="Notas" value={stats.total_notes} />
              </div>
            </div>
          </>
        )}

        {!stats && !error && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-border bg-card"
              />
            ))}
          </div>
        )}
      </div>
    </ConsoleLayout>
  );
}
