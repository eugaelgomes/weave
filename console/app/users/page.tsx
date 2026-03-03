"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ConsoleLayout } from "@/app/components/ConsoleLayout";
import { SearchBar } from "@/app/components/SearchBar";
import { Badge } from "@/app/components/Badge";
import { PaginationControls } from "@/app/components/PaginationControls";
import {
  listUsers,
  type User,
  type Pagination,
} from "@/app/services/api";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listUsers({ page, limit: 20, search, status });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

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
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerenciar contas de usuários
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por nome, email ou username..."
            className="w-80"
          />
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            title="Filtrar por status"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="deleted">Deletados</option>
            <option value="verified">Verificados</option>
            <option value="unverified">Não verificados</option>
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
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Username
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Plano
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Criado em
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Último login
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
                : users.map((user) => (
                    <tr
                      key={user.user_id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/users/${user.user_id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {user.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        @{user.username}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {user.deleted ? (
                            <Badge variant="destructive">Deletado</Badge>
                          ) : user.email_verified ? (
                            <Badge variant="success">Verificado</Badge>
                          ) : (
                            <Badge variant="warning">Não verificado</Badge>
                          )}
                          {user.auth_with_google && (
                            <Badge variant="outline">Google</Badge>
                          )}
                          {user.auth_with_github && (
                            <Badge variant="outline">GitHub</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {user.plan_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(user.last_login)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {!loading && users.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum usuário encontrado
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
