"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/app/components/Badge";
import { StatCard } from "@/app/components/StatCard";
import {
  getOrganization,
  updateOrganization,
  deleteOrganization,
  restoreOrganization,
  type OrganizationDetail,
  type OrgMember,
} from "@/app/services/api";

export default function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [org, setOrg] = useState<OrganizationDetail | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    org_name: "",
    unique_name: "",
    description: "",
  });

  useEffect(() => {
    getOrganization(id)
      .then((data) => {
        setOrg(data.organization);
        setMembers(data.members);
        setEditForm({
          org_name: data.organization.org_name,
          unique_name: data.organization.unique_name,
          description: data.organization.description || "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggleDelete = async () => {
    if (!org) return;
    setActionLoading(true);
    try {
      if (org.deleted) {
        await restoreOrganization(id);
      } else {
        await deleteOrganization(id);
      }
      const data = await getOrganization(id);
      setOrg(data.organization);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na ação");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    setActionLoading(true);
    try {
      await updateOrganization(id, editForm);
      const data = await getOrganization(id);
      setOrg(data.organization);
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

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin":
        return "destructive" as const;
      case "admin":
        return "default" as const;
      case "member":
        return "outline" as const;
      default:
        return "outline" as const;
    }
  };

  if (loading) {
    return (
      <>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      </>
    );
  }

  if (!org) {
    return (
      <>
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Organização não encontrada
          </h1>
          <button
            onClick={() => router.push("/organizations")}
            className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Voltar
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={() => router.push("/organizations")}
              className="mb-2 text-sm text-muted-foreground hover:text-foreground"
            >
              ← Voltar para Organizações
            </button>
            <h1 className="text-2xl font-bold text-foreground">
              {org.org_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              @{org.unique_name} · Dono: {org.owner_name} ({org.owner_email})
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
                org.deleted
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }`}
            >
              {org.deleted ? "Restaurar" : "Desativar"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Membros" value={org.member_count} />
          <StatCard title="Plano" value={org.plan_name || "Sem plano"} />
          <StatCard title="Criada em" value={formatDate(org.created_at)} />
        </div>

        {/* Status */}
        <div className="flex gap-2">
          {org.deleted ? (
            <Badge variant="destructive">Deletada</Badge>
          ) : (
            <Badge variant="success">Ativa</Badge>
          )}
        </div>

        {/* Info / Edit */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Informações da Organização
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
                    value={editForm.org_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, org_name: e.target.value })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Identificador único
                  </label>
                  <input
                    type="text"
                    value={editForm.unique_name}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        unique_name: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Descrição
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Nome" value={org.org_name} />
                <InfoRow label="Identificador" value={org.unique_name} />
                <InfoRow
                  label="Descrição"
                  value={org.description || "—"}
                />
                <InfoRow
                  label="Dono"
                  value={`${org.owner_name} (@${org.owner_username})`}
                />
                <InfoRow label="Plano" value={org.plan_name || "—"} />
                <InfoRow label="Criada em" value={formatDate(org.created_at)} />
                <InfoRow
                  label="Atualizada em"
                  value={formatDate(org.updated_at)}
                />
              </>
            )}
          </div>
        </div>

        {/* Members */}
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">
              Membros ({members.length})
            </h2>
          </div>
          {members.length > 0 ? (
            <div className="overflow-x-auto">
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
                      Role
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Convidado por
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Entrou em
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.membership_id}
                      className="border-b border-border transition-colors hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/users/${member.user_id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {member.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {member.email}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadgeVariant(member.role)}>
                          {member.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {member.suspended ? (
                          <Badge variant="warning">Suspenso</Badge>
                        ) : (
                          <Badge variant="success">{member.status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {member.invited_by_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(member.joined_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum membro encontrado
            </div>
          )}
        </div>
      </div>
    </>
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
