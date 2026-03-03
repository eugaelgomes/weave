"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ConsoleLayout } from "@/app/components/ConsoleLayout";
import { Badge } from "@/app/components/Badge";
import { StatCard } from "@/app/components/StatCard";
import {
  getUser,
  updateUser,
  deleteUser,
  restoreUser,
  type UserDetail,
  type UserStats,
} from "@/app/services/api";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    username: "",
  });

  useEffect(() => {
    getUser(id)
      .then((data) => {
        setUser(data.user);
        setStats(data.stats);
        setEditForm({
          name: data.user.name,
          email: data.user.email,
          username: data.user.username,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggleDelete = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (user.deleted) {
        await restoreUser(id);
      } else {
        await deleteUser(id);
      }
      const data = await getUser(id);
      setUser(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na ação");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      await updateUser(id, editForm);
      const data = await getUser(id);
      setUser(data.user);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("pt-BR");
  };

  if (loading) {
    return (
      <ConsoleLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </ConsoleLayout>
    );
  }

  if (!user) {
    return (
      <ConsoleLayout>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Usuário não encontrado
          </h1>
          <button
            onClick={() => router.push("/users")}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Voltar
          </button>
        </div>
      </ConsoleLayout>
    );
  }

  return (
    <ConsoleLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => router.push("/users")}
              className="mb-2 text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar para Usuários
            </button>
            <h1 className="text-2xl font-bold text-foreground">{user.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              @{user.username} · {user.email}
            </p>
          </div>
          <div className="flex gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
              >
                Editar
              </button>
            ) : (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={actionLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  Salvar
                </button>
              </>
            )}
            <button
              onClick={handleToggleDelete}
              disabled={actionLoading}
              className={`rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
                user.deleted
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }`}
            >
              {user.deleted ? "Restaurar" : "Desativar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Notas" value={stats.total_notes} />
            <StatCard title="Projetos" value={stats.total_projects} />
            <StatCard title="Notas Compartilhadas" value={stats.shared_notes} />
            <StatCard
              title="Organizações"
              value={stats.org_memberships}
            />
          </div>
        )}

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {user.deleted ? (
            <Badge variant="destructive">Deletado</Badge>
          ) : (
            <Badge variant="success">Ativo</Badge>
          )}
          {user.email_verified ? (
            <Badge variant="success">Email Verificado</Badge>
          ) : (
            <Badge variant="warning">Email Não Verificado</Badge>
          )}
          {user.auth_with_google && <Badge variant="outline">Google</Badge>}
          {user.auth_with_github && <Badge variant="outline">GitHub</Badge>}
          {user.private_profile && <Badge variant="outline">Privado</Badge>}
        </div>

        {/* Info / Edit Form */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Informações do Usuário
            </h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            {editing ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm({ ...editForm, username: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Nome" value={user.name} />
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Username" value={`@${user.username}`} />
                <InfoRow label="Telefone" value={user.phone_number || "—"} />
                <InfoRow
                  label="Data de nascimento"
                  value={user.birth_date || "—"}
                />
                <InfoRow label="Timezone" value={user.timezone || "—"} />
                <InfoRow label="Tema" value={user.theme_mode} />
                <InfoRow
                  label="Organização"
                  value={
                    user.org_name
                      ? `${user.org_name} (${user.org_unique_name})`
                      : "—"
                  }
                />
                <InfoRow label="Plano" value={user.plan_name || "—"} />
                <InfoRow label="Criado em" value={formatDate(user.created_at)} />
                <InfoRow
                  label="Atualizado em"
                  value={formatDate(user.updated_at)}
                />
                <InfoRow
                  label="Último login"
                  value={formatDate(user.last_login)}
                />
                <InfoRow
                  label="Email verificado em"
                  value={formatDate(user.email_verified_at)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </ConsoleLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}
