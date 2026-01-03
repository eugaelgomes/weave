"use client";

import React, { useState, useEffect } from "react";
import { useOrganization } from "@/app/contexts/OrganizationContext";
import { useAuth } from "@/app/contexts/AuthContext";
import Image from "next/image";
import { getUsers } from "@/app/services/authentication/AuthService";
import type { User } from "@/app/services/authentication/AuthService";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  X,
  Activity,
  Crown,
  Mail,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { IoPersonCircleSharp } from "react-icons/io5";

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
    owner:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20",
    admin:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    member:
      "bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700",
  };

  const labels = {
    owner: "Proprietário",
    admin: "Admin",
    member: "Membro",
  };

  const icons = {
    owner: Crown,
    admin: Shield,
    member: Users,
  };

  const Icon = icons[role as keyof typeof icons] || Users;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${styles[role as keyof typeof styles] || styles.member}`}
    >
      <Icon className="h-3 w-3" />
      {labels[role as keyof typeof labels] || role}
    </span>
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
    organization,
    loading,
    hasOrganization,
    addMember: addMemberToOrg,
    removeMember: removeMemberFromOrg,
    isOwner,
    canManageMembers,
  } = useOrganization();

  const [showAddMember, setShowAddMember] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [usersData, setUsersData] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { organization, members } = useOrganization();

  const userCanManage = user?.id ? canManageMembers(user.id) : false;

  // Buscar dados dos usuários
  useEffect(() => {
    const fetchUsersData = async () => {
      if (!hasOrganization) return;

      setLoadingUsers(true);
      try {
        const users = await getUsers();
        setUsersData(users);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsersData();
  }, [hasOrganization]);

  const getUserData = (userId: string): User | undefined => {
    return usersData.find((u) => u.id === userId);
  };

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

  if (loading || loadingUsers) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-neutral-950">
        <Activity className="h-6 w-6 animate-spin text-yellow-500" />
      </div>
    );
  }

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

  // Certifique-se que organization é do tipo Organization
  const members = organization?.members || { owner: "", admins: [], members: [], invited: [] };

  const allMembers = [
    { id: members.owner, role: "owner" as const },
    ...(members.admins || []).map((id) => ({ id, role: "admin" as const })),
    ...(members.members || []).map((id) => ({ id, role: "member" as const })),
  ].filter((m) => {
    const userData = getUserData(m.id);
    const searchLower = searchTerm.toLowerCase();
    return (
      m.id.toLowerCase().includes(searchLower) ||
      userData?.name?.toLowerCase().includes(searchLower) ||
      userData?.username?.toLowerCase().includes(searchLower) ||
      userData?.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex h-full flex-col bg-white dark:bg-neutral-950">
      {/* Header */}
      <div className="border-b border-neutral-200 px-6 py-5 dark:border-neutral-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Equipe</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Gerencie o acesso e funções dos membros.
            </p>
          </div>

          {userCanManage && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-neutral-950 transition-colors hover:bg-yellow-600"
            >
              <Plus className="h-4 w-4" />
              Adicionar Membro
            </button>
          )}
        </div>

        {/* Barra de Busca */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              placeholder="Buscar membros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-9 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900"
            />
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {allMembers.length} {allMembers.length === 1 ? "membro" : "membros"}
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
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Membro</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
              {allMembers.map((member) => {
                const isCurrentUser = member.id === user?.id;
                const canRemove = userCanManage && member.role !== "owner" && !isCurrentUser;
                const userData = getUserData(member.id);

                return (
                  <tr
                    key={member.id}
                    className="group hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={userData} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100">
                            {userData?.name || member.id}
                            {isCurrentUser && (
                              <span className="ml-2 text-xs font-normal text-neutral-500">
                                (Você)
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400">
                            {userData?.username || userData?.email || member.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge role={member.role} />
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

        {/* Seção de Convites Pendentes */}
        {members.invited && members.invited.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              Convites Pendentes
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {members.invited.map((invitedId) => {
                const invitedUser = getUserData(invitedId);

                return (
                  <div
                    key={invitedId}
                    className="flex items-center justify-between rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/30"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-sm dark:bg-neutral-800">
                        <Mail className="h-4 w-4 text-neutral-400" />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100"
                          title={invitedUser?.name || invitedId}
                        >
                          {invitedUser?.name || invitedId}
                        </p>
                        {invitedUser?.email && (
                          <p className="truncate text-xs text-neutral-600 dark:text-neutral-400">
                            {invitedUser.email}
                          </p>
                        )}
                      </div>
                    </div>
                    {userCanManage && (
                      <button
                        onClick={() => handleRemoveMember(invitedId)}
                        className="ml-2 shrink-0 text-xs font-medium text-neutral-500 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
                      >
                        Revogar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
