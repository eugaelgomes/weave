"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ConsoleLayout } from "@/app/components/ConsoleLayout";
import { SearchBar } from "@/app/components/SearchBar";
import { Badge } from "@/app/components/Badge";
import { PaginationControls } from "@/app/components/PaginationControls";
import {
  listOrganizations,
  type Organization,
  type Pagination,
} from "@/app/services/api";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listOrganizations({
        page,
        limit: 20,
        search,
        status,
      });
      setOrgs(data.organizations);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const debounce = setTimeout(fetchOrgs, 300);
    return () => clearTimeout(debounce);
  }, [fetchOrgs]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerenciar organizações
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por nome ou identificador..."
            className="w-80"
          />
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            title="Filtrar por status"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todos</option>
            <option value="active">Ativas</option>
            <option value="deleted">Deletadas</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Nome
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Identificador
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Dono
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Membros
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Plano
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Criada em
                </th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                        </td>
                      ))}
                    </tr>
                  ))
                : orgs.map((org) => (
                    <tr
                      key={org.id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/organizations/${org.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {org.org_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {org.unique_name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {org.owner_name}
                      </td>
                      <td className="px-4 py-3">
                        {org.deleted ? (
                          <Badge variant="destructive">Deletada</Badge>
                        ) : (
                          <Badge variant="success">Ativa</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {org.member_count}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {org.plan_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(org.created_at)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && orgs.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma organização encontrada
            </div>
          )}
        </div>

        {pagination && (
          <PaginationControls
            pagination={pagination}
            onPageChange={setPage}
          />
        )}
      </div>
    </ConsoleLayout>
  );
}
