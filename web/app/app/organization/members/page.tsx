"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { useAuth } from "@/app/contexts/AuthContext";
import Image from "next/image";
import type { User } from "@/app/services/authentication/AuthService";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  X,
  Activity,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderOpen,
  Clock,
  Info,
  Calendar,
} from "lucide-react";
import { IoPersonCircleSharp } from "react-icons/io5";

// --- Tipos ---
interface ActivityData {
  notes_count: number;
  projects: Array<{
    project_id: string;
    project_name: string;
    role: string;
  }>;
  last_login_at: string | null;
}

interface InviterData {
  id: string;
  name?: string;
  username?: string;
  avatar_url?: string | null;
}

// --- Componentes de UI Reutilizáveis ---

const UserAvatar = ({ user, size = "sm" }: { user?: User; size?: "sm" | "md" }) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
  };

  const wrapperClass = `${sizeClasses[size]} overflow-hidden rounded-md border-2 border-neutral-200 dark:border-neutral-700 flex-shrink-0`;

  if (user?.avatar_url && typeof user.avatar_url === "string") {
    return (
      <div className={wrapperClass}>
        <Image
          src={user.avatar_url}
          alt="Avatar"
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <IoPersonCircleSharp
      className={`${sizeClasses[size]} text-neutral-400 dark:text-neutral-500`}
    />
  );
};

const Badge = ({ role }: { role: string }) => {
  const styles = {
    super_admin:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
    admin:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    member:
      "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
    guest:
      "bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-500 dark:border-neutral-700",
  };

  const labels = {
    super_admin: "Super Admin",
    admin: "Admin",
    member: "Membro",
    guest: "Convidado",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${styles[role as keyof typeof styles] || styles.member}`}
    >
      {labels[role as keyof typeof labels] || role}
    </span>
  );
};

const personIcon = (
  <IoPersonCircleSharp className="h-10 w-10 text-neutral-400 dark:text-neutral-500" />
);

// --- Modal de Atividade ---
const ActivityModal = ({
  isOpen,
  onClose,
  memberName,
  activity,
}: {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  activity: ActivityData;
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-lg rounded-md border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Atividade de {memberName}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Resumo de atividades na organização
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Notas */}
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <FileText className="h-4 w-4 text-neutral-500" />
              Notas Criadas
            </div>
            <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {activity.notes_count}
            </p>
          </div>

          {/* Último Login */}
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Clock className="h-4 w-4 text-neutral-500" />
              Último Login
            </div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {formatDate(activity.last_login_at)}
            </p>
          </div>

          {/* Projetos */}
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <FolderOpen className="h-4 w-4 text-neutral-500" />
              Projetos ({activity.projects.length})
            </div>
            {activity.projects.length > 0 ? (
              <div className="space-y-2">
                {activity.projects.map((project) => (
                  <div
                    key={project.project_id}
                    className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 dark:bg-neutral-950"
                  >
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">
                      {project.project_name}
                    </span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">
                      {project.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Nenhum projeto</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Modal de Informações (Quem Convidou) ---
const InviterModal = ({
  isOpen,
  onClose,
  memberName,
  inviter,
  joinedAt,
}: {
  isOpen: boolean;
  onClose: () => void;
  memberName: string;
  inviter: InviterData | null;
  joinedAt: string;
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-md rounded-md border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Detalhes de {memberName}
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Detalhes do ingresso na organização
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Data de Ingresso */}
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Calendar className="h-4 w-4 text-neutral-500" />
              Data de Ingresso
            </div>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {formatDate(joinedAt)}
            </p>
          </div>

          {/* Convidado Por */}
          <div className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
              <Info className="h-4 w-4 text-neutral-500" />
              Convidado Por
            </div>
            {inviter ? (
              <div className="flex items-center gap-3">
                <UserAvatar
                  user={{ id: inviter.id, avatar_url: inviter.avatar_url || undefined } as User}
                  size="md"
                />
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {inviter.name || inviter.id}
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {inviter.username || inviter.id}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Membro fundador</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const AddMemberModal = ({
  isOpen,
  onClose,
  onAdd,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (memberId: string, role: "admin" | "member") => void;
  loading: boolean;
}) => {
  const [memberId, setMemberId] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberId.trim()) onAdd(memberId.trim(), role);
  };

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200">
      <div className="w-full max-w-md rounded-md border border-neutral-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Convidar Membro
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Adicione alguém à sua equipe.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Email ou ID do Usuário
            </label>
            <input
              type="text"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="ex: usuario@email.com"
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Nível de Acesso
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("member")}
                className={`flex flex-col items-center justify-center rounded-md border p-2.5 text-center transition-all ${
                  role === "member"
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-500 dark:bg-yellow-500/10 dark:text-yellow-400"
                    : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                }`}
              >
                <Users className="mb-1.5 h-5 w-5" />
                <span className="text-xs font-medium">Membro</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("admin")}
                className={`flex flex-col items-center justify-center rounded-md border p-2.5 text-center transition-all ${
                  role === "admin"
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700 dark:border-yellow-500 dark:bg-yellow-500/10 dark:text-yellow-400"
                    : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                }`}
              >
                <Shield className="mb-1.5 h-5 w-5" />
                <span className="text-xs font-medium">Admin</span>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !memberId.trim()}
              className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-neutral-950 hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading && <Activity className="h-4 w-4 animate-spin" />}
              Convidar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Página Principal ---

const MembersPage = () => {
  const { user } = useAuth();
  const {
    hasOrganization,
    addMember: addMemberToOrg,
    removeMember: removeMemberFromOrg,
    canManageMembers,
  } = useOrganization();

  const [showAddMember, setShowAddMember] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<{
    name: string;
    data: ActivityData;
  } | null>(null);
  const [selectedInviter, setSelectedInviter] = useState<{
    name: string;
    inviter: InviterData | null;
    joinedAt: string;
  } | null>(null);
  const { members: organizationMembers } = useOrganization();

  // Apenas admin e super_admin podem gerenciar membros (adicionar/remover)
  const userCanManage = user?.id ? canManageMembers(user.id) : false;

  const handleAddMember = async (memberId: string, role: "admin" | "member") => {
    setActionLoading(true);
    setStatus(null);
    try {
      await addMemberToOrg(memberId, role);
      setStatus({ type: "success", message: `Convite enviado para ${memberId}` });
      setShowAddMember(false);
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Falha ao adicionar membro" });
    } finally {
      setActionLoading(false);
      // Limpa mensagem após 3s
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remover este membro da organização?")) return;
    setActionLoading(true);
    try {
      await removeMemberFromOrg(memberId);
      setStatus({ type: "success", message: "Membro removido com sucesso" });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (!hasOrganization) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 rounded-md bg-neutral-100 p-3 dark:bg-neutral-900">
          <Users className="h-8 w-8 text-neutral-400" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Sem organização
        </h2>
        <p className="mt-2 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
          Crie uma organização para começar a adicionar sua equipe e colaborar.
        </p>
      </div>
    );
  }

  const allMembers = (organizationMembers || []).filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      member.id.toLowerCase().includes(searchLower) ||
      member.name?.toLowerCase().includes(searchLower) ||
      member.username?.toLowerCase().includes(searchLower) ||
      member.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex h-full flex-col space-y-4 bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <h1 className="sm:text-md text-base font-medium tracking-tight text-neutral-900 dark:text-neutral-100">
            Equipe
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Gerencie o acesso e funções dos membros
          </p>
        </div>

        {/* Barra de Busca */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              placeholder="Buscar por nome, email ou username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-white py-2.5 pr-4 pl-10 text-sm shadow-sm transition-colors placeholder:text-neutral-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:placeholder:text-neutral-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md bg-neutral-100 px-3 py-2 dark:bg-neutral-800/50">
              <Users className="h-4 w-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                {allMembers.length} {allMembers.length === 1 ? "membro" : "membros"}
              </span>
            </div>

            {userCanManage && (
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-600 hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Adicionar Membro</span>
                <span className="sm:hidden">Adicionar</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {status && (
          <div
            className={`animate-in slide-in-from-top-2 mt-3 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm ${
              status.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {status.message}
          </div>
        )}
      </div>

      {/* Tabela de Membros */}
      <div className="flex-1 overflow-auto">
        <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Membro</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Atividade</th>
                <th className="px-4 py-3 font-medium">Detalhes</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
              {allMembers.map((member) => {
                const isCurrentUser = member.id === user?.id;
                // Apenas super_admin pode remover admin/member/guest, admin pode remover member/guest
                const currentUserMember = organizationMembers?.find((m) => m.id === user?.id);
                const currentUserRole = currentUserMember?.membership.role;
                const canRemove =
                  userCanManage &&
                  !isCurrentUser &&
                  member.membership.role !== "super_admin" &&
                  (currentUserRole === "super_admin" ||
                    (currentUserRole === "admin" && member.membership.role !== "admin"));

                return (
                  <tr
                    key={member.id}
                    className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          user={
                            { id: member.id, avatar_url: member.avatar_url || personIcon } as User
                          }
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {member.name || member.id}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs font-normal text-neutral-500">
                                (Você)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            {member.username || member.email || member.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge role={member.membership.role} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setSelectedActivity({
                            name: member.name || member.username || member.id,
                            data: member.activity,
                          })
                        }
                        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-yellow-600 dark:text-neutral-400 dark:hover:text-yellow-400"
                      >
                        <Activity className="h-4 w-4" />
                        <span>{member.activity.notes_count} notas</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setSelectedInviter({
                            name: member.name || member.username || member.id,
                            inviter: member.invited_by,
                            joinedAt: member.membership.created_at,
                          })
                        }
                        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-yellow-600 dark:text-neutral-400 dark:hover:text-yellow-400"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={actionLoading}
                          className="invisible rounded-md p-2 text-neutral-400 group-hover:visible hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Remover acesso"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {allMembers.length === 0 && (
            <div className="p-8 text-center text-sm text-neutral-500">
              Nenhum membro encontrado.
            </div>
          )}
        </div>
      </div>

      <ActivityModal
        isOpen={selectedActivity !== null}
        onClose={() => setSelectedActivity(null)}
        memberName={selectedActivity?.name || ""}
        activity={selectedActivity?.data || { notes_count: 0, projects: [], last_login_at: null }}
      />

      <InviterModal
        isOpen={selectedInviter !== null}
        onClose={() => setSelectedInviter(null)}
        memberName={selectedInviter?.name || ""}
        inviter={selectedInviter?.inviter || null}
        joinedAt={selectedInviter?.joinedAt || ""}
      />

      <AddMemberModal
        isOpen={showAddMember}
        onClose={() => setShowAddMember(false)}
        onAdd={handleAddMember}
        loading={actionLoading}
      />
    </div>
  );
};

export default MembersPage;
