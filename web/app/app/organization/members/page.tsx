"use client";

import React, { useState } from "react";
import { useOrganization } from "@/app/_contexts/organization-context";
import { useAuth } from "@/app/_contexts/auth-context";
import Image from "next/image";
import {
  Users,
  Plus,
  Trash2,
  X,
  Activity,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderOpen,
  Clock,
  MoreVertical,
  ShieldAlert,
  Mail,
  Edit2,
} from "lucide-react";
import { IoPersonCircleSharp } from "react-icons/io5";
import { OrganizationHeader } from "@/app/app/_components/ui/headers/organization-header"; // Ajuste o path conforme seu projeto
import getStorageUrl from "@/app/_utils/get-storage-url"; // Ajuste o path

// --- UI Components ---

type AvatarUser = { avatar_url?: string | null };

const UserAvatar = ({ user, size = "sm" }: { user?: AvatarUser; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" };
  const wrapperClass = `${sizeClasses[size]} relative overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 flex-shrink-0 dark:border-neutral-800 dark:bg-neutral-800`;

  if (user?.avatar_url && typeof user.avatar_url === "string") {
    return (
      <div className={wrapperClass}>
        <Image
          src={getStorageUrl(user.avatar_url)}
          alt="Avatar"
          fill
          className="object-cover"
          sizes="50px"
        />
      </div>
    );
  }
  return (
    <div className={`${wrapperClass} flex items-center justify-center`}>
      <IoPersonCircleSharp className="h-full w-full text-neutral-400 dark:text-neutral-500" />
    </div>
  );
};

const Badge = ({ role }: { role: string }) => {
  const styles = {
    super_admin: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
    admin: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
    member: "bg-neutral-500/10 text-neutral-700 border-neutral-500/20 dark:text-neutral-300",
    guest:
      "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800/50 dark:border-neutral-800",
  };
  const labels = {
    super_admin: "Super Admin",
    admin: "Admin",
    member: "Membro",
    guest: "Convidado",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase ${styles[role as keyof typeof styles] || styles.member}`}
    >
      {labels[role as keyof typeof labels] || role}
    </span>
  );
};

// --- Modals Base (Padrão da Marca) ---

const ModalBase = ({ isOpen, onClose, title, children, footer }: any) => {
  if (!isOpen) return null;
  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-md border border-t-4 border-neutral-200 border-t-yellow-500 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <button
          onClick={onClose}
          title="Fechar modal"
          aria-label="Fechar modal"
          className="absolute top-4 right-4 z-10 rounded-full p-2 text-neutral-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20 dark:hover:text-yellow-500"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="p-6 pb-2">
          <h2 className="text-lg leading-tight font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-6 pt-2 text-sm">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-800 dark:bg-neutral-900/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Modals Específicos ---

const InviteModal = ({ isOpen, onClose, onInvite, loading }: any) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "guest">("member");

  const handleSubmit = () => {
    if (email) onInvite(email, role);
  };

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Convidar Novo Membro"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !email}
            className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar Convite"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 text-xs font-semibold text-neutral-500 uppercase">
            E-mail do Usuário
          </label>
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full rounded-md border border-neutral-300 py-2 pr-3 pl-9 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 text-xs font-semibold text-neutral-500 uppercase">
            Nível de Acesso
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            title="Selecionar nível de acesso"
            aria-label="Selecionar nível de acesso"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            <option value="admin">Administrador</option>
            <option value="member">Membro Padrão</option>
            <option value="guest">Convidado</option>
          </select>
        </div>
      </div>
    </ModalBase>
  );
};

const RoleManageModal = ({ isOpen, onClose, onUpdate, loading, currentMember }: any) => {
  const [role, setRole] = useState(currentMember?.membership?.role || "member");

  React.useEffect(() => {
    if (currentMember) setRole(currentMember.membership.role);
  }, [currentMember]);

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Gerenciar Nível de Acesso"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400"
          >
            Cancelar
          </button>
          <button
            onClick={() => onUpdate(currentMember.id, role)}
            disabled={loading || role === currentMember?.membership?.role}
            className="rounded-md bg-yellow-500 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar Alterações"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
          <UserAvatar user={{ avatar_url: currentMember?.avatar_url }} size="md" />
          <div>
            <p className="text-sm font-semibold dark:text-white">
              {currentMember?.name || currentMember?.email}
            </p>
            <Badge role={currentMember?.membership?.role || "member"} />
          </div>
        </div>
        <div>
          <label className="mb-1 text-xs font-semibold text-neutral-500 uppercase">
            Novo Nível
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            title="Selecionar novo nível"
            aria-label="Selecionar novo nível"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
          >
            <option value="admin">Administrador</option>
            <option value="member">Membro Padrão</option>
            <option value="guest">Convidado</option>
          </select>
          <p className="mt-2 text-xs text-neutral-500">
            Avisaremos o usuário sobre a mudança de permissões.
          </p>
        </div>
      </div>
    </ModalBase>
  );
};

// --- Página Principal ---

export default function MembersPage() {
  const { user } = useAuth();
  const { hasOrganization, members, addMember, removeMember, updateMemberRole, canManageMembers } =
    useOrganization();

  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Controle de Modais
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [memberToEdit, setMemberToEdit] = useState<any>(null);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);

  const userCanManage = user?.id ? canManageMembers(user.id) : false;

  const showFeedback = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleInvite = async (email: string, role: any) => {
    setLoadingAction(true);
    try {
      await addMember(email, role);
      showFeedback("success", `Convite enviado para ${email}`);
      setShowInviteModal(false);
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao enviar convite.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    setLoadingAction(true);
    try {
      await updateMemberRole(memberId, newRole);
      showFeedback("success", "Função atualizada com sucesso.");
      setMemberToEdit(null);
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao atualizar permissão.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemove = async () => {
    if (!memberToRemove) return;
    setLoadingAction(true);
    try {
      await removeMember(memberToRemove.id);
      showFeedback("success", "Membro removido da organização.");
      setMemberToRemove(null);
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao remover membro.");
    } finally {
      setLoadingAction(false);
    }
  };

  if (!hasOrganization) {
    // Manter o Empty State Premium da versão anterior
    return (
      <div className="p-8 text-center text-neutral-500">
        Crie uma organização para gerenciar membros.
      </div>
    );
  }

  const filteredMembers = (members || []).filter(
    (m) =>
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto w-full space-y-2">
      <OrganizationHeader />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Gerenciamento de Equipe
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Visualize e controle as permissões dos membros.
          </p>
        </div>
        {userCanManage && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-600 active:scale-95"
          >
            <Plus className="h-4 w-4" /> <span>Convidar Membro</span>
          </button>
        )}
      </div>

      {status && (
        <div
          className={`flex items-center gap-3 rounded-md border p-4 text-sm font-medium ${status.type === "success" ? "border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400" : "border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"}`}
        >
          {status.type === "success" ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {status.message}
        </div>
      )}

      <div className="flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-col gap-4 border-b border-neutral-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-transparent py-2 pr-4 pl-9 text-sm outline-none focus:border-yellow-500 focus:ring-1 dark:border-neutral-700 dark:text-white"
            />
          </div>
          <div className="text-sm font-medium text-neutral-500">
            {filteredMembers.length} membros
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/50 dark:bg-neutral-950/50">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
                  Usuário
                </th>
                <th className="px-6 py-3 text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
                  Função
                </th>
                <th className="px-6 py-3 text-right text-[11px] font-bold tracking-wider text-neutral-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredMembers.map((member) => {
                const isCurrentUser = member.id === user?.id;
                // Lógica de negócio: Super Admin não pode ser editado/removido via UI comum, a menos que seja outro Super Admin manipulando
                const isProtectedRole = member.membership.role === "super_admin";
                const canEdit =
                  userCanManage &&
                  !isCurrentUser &&
                  (!isProtectedRole ||
                    members.find((m) => m.id === user?.id)?.membership.role === "super_admin");

                return (
                  <tr
                    key={member.id}
                    className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <UserAvatar user={member} size="md" />
                        <div>
                          <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
                            {member.name || "Usuário"}{" "}
                            {isCurrentUser && (
                              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                                VOCÊ
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-500">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge role={member.membership.role} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {canEdit && (
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => setMemberToEdit(member)}
                            className="rounded-md p-2 text-neutral-400 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
                            title="Editar Função"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setMemberToRemove(member)}
                            className="rounded-md p-2 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            title="Remover"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renderização dos Modais */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        loading={loadingAction}
      />
      <RoleManageModal
        isOpen={!!memberToEdit}
        onClose={() => setMemberToEdit(null)}
        currentMember={memberToEdit}
        onUpdate={handleUpdateRole}
        loading={loadingAction}
      />

      {/* Modal de Confirmação de Remoção Seguro */}
      <ModalBase
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        title="Remover Membro"
        footer={
          <>
            <button
              onClick={() => setMemberToRemove(null)}
              className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleRemove}
              disabled={loadingAction}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loadingAction ? "Removendo..." : "Sim, remover membro"}
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center p-4 text-center">
          <ShieldAlert className="mb-4 h-12 w-12 text-red-500" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Tem certeza que deseja remover{" "}
            <strong>{memberToRemove?.name || memberToRemove?.email}</strong> da organização? Eles
            perderão acesso a todos os projetos e notas internas.
          </p>
        </div>
      </ModalBase>
    </div>
  );
}
