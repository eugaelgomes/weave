"use client";

import React, { useEffect, useState } from "react";
import { useOrganization } from "@/app/_contexts/organization-context";
import { useAuth } from "@/app/_contexts/auth-context";
import { useLanguage } from "@/app/_contexts/language-context";
import type { OrganizationArea } from "@/app/_services/organization";
import { Plus, X, Mail, ChevronDown, User, Layers3 } from "lucide-react";
import { OrganizationHeader } from "@/app/(protected)/_components/ui/headers/organization-header";

// --- UI Components ---

const Badge = ({ role }: { role: string }) => {
  const { t } = useLanguage();
  const styles = {
    super_admin:
      "bg-brand-primary-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
    admin: "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400",
    member: "bg-neutral-500/10 text-neutral-700 border-neutral-500/20 dark:text-neutral-300",
    guest:
      "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-800/50 dark:border-neutral-800",
  };
  const labels = {
    super_admin: t.organizationMembers.superAdmin,
    admin: t.organizationMembers.admin,
    member: t.organizationMembers.member,
    guest: t.organizationMembers.guest,
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wider ${styles[role as keyof typeof styles] || styles.member}`}
    >
      {labels[role as keyof typeof labels] || role}
    </span>
  );
};

// --- Modals Base ---

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
          className="dark:hover:text-brand-primary-500 absolute top-4 right-4 z-10 rounded-md p-1.5 text-neutral-500 hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-900/20"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-5 pb-2">
          <h2 className="text-base leading-tight font-bold text-neutral-900 dark:text-white">
            {title}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pt-2 text-xs">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-neutral-100 bg-neutral-50/50 p-3 dark:border-neutral-800 dark:bg-neutral-900/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

type InviteFormPayload = {
  email: string;
  name: string;
  role: "admin" | "member" | "guest";
  area_id?: string;
  area_member_role?: "manager" | "editor" | "viewer";
};

const InviteModal = ({
  isOpen,
  onClose,
  onInvite,
  loading,
  areas,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (payload: InviteFormPayload) => void;
  loading: boolean;
  areas: OrganizationArea[];
}) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member" | "guest">("member");
  const [areaId, setAreaId] = useState("");
  const [areaRole, setAreaRole] = useState<"manager" | "editor" | "viewer">("editor");

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setEmail("");
    setRole("member");
    setAreaId("");
    setAreaRole("editor");
  }, [isOpen]);

  const handleSubmit = () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail || !trimmedName) return;
    const payload: InviteFormPayload = {
      email: trimmedEmail,
      name: trimmedName,
      role,
    };
    if (areaId) {
      payload.area_id = areaId;
      payload.area_member_role = areaRole;
    }
    onInvite(payload);
  };

  const canSubmit = Boolean(email.trim() && name.trim());

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={t.organizationMembers.inviteModalTitle}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          >
            {t.organizationMembers.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="bg-brand-primary-500 rounded-md px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? t.organizationMembers.sending : t.organizationMembers.sendInvite}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.inviteeFullName}
          </label>
          <div className="relative">
            <User className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              autoComplete="name"
              className="w-full rounded-md border border-neutral-300 py-1.5 pr-2 pl-8 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.userEmail}
          </label>
          <div className="relative">
            <Mail className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full rounded-md border border-neutral-300 py-1.5 pr-2 pl-8 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.accessLevel}
          </label>
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member" | "guest")}
              className="w-full appearance-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            >
              <option value="admin">{t.organizationMembers.adminRole}</option>
              <option value="member">{t.organizationMembers.standardRole}</option>
              <option value="guest">{t.organizationMembers.guestRole}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
        <div>
          <label className="mb-1 text-[10px] font-semibold text-neutral-500">
            {t.organizationMembers.areaOptional}
          </label>
          <div className="relative">
            <Layers3 className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="w-full appearance-none rounded-md border border-neutral-300 py-1.5 pr-8 pl-8 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
            >
              <option value="">{t.organizationMembers.areaNone}</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.area_name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
        {areaId ? (
          <div>
            <label className="mb-1 text-[10px] font-semibold text-neutral-500">
              {t.organizationMembers.areaRoleLabel}
            </label>
            <div className="relative">
              <select
                value={areaRole}
                onChange={(e) => setAreaRole(e.target.value as "manager" | "editor" | "viewer")}
                className="w-full appearance-none rounded-md border border-neutral-300 px-3 py-1.5 text-xs focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              >
                <option value="manager">{t.organizationMembers.areaManager}</option>
                <option value="editor">{t.organizationMembers.areaEditor}</option>
                <option value="viewer">{t.organizationMembers.areaViewer}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
        ) : null}
      </div>
    </ModalBase>
  );
};

export default function InvitesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const {
    hasOrganization,
    invites,
    inviteMember,
    cancelInvite,
    canManageMembers,
    areas,
    fetchAreas,
  } = useOrganization();

  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const userCanManage = user?.id ? canManageMembers(user.id) : false;

  const showFeedback = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  useEffect(() => {
    if (showInviteModal) fetchAreas(true).catch(() => {});
  }, [showInviteModal, fetchAreas]);

  const handleInvite = async (payload: InviteFormPayload) => {
    setLoadingAction(true);
    try {
      const result = await inviteMember({
        email: payload.email,
        role: payload.role,
        name: payload.name,
        area_id: payload.area_id,
        area_member_role: payload.area_member_role,
      });
      if (!result.success) {
        showFeedback("error", result.message || t.organizationMembers.inviteError);
        return;
      }
      showFeedback(
        "success",
        t.organizationMembers.inviteSuccess.replace("{email}", payload.email)
      );
      setShowInviteModal(false);
    } catch (err: any) {
      showFeedback("error", err.message || t.organizationMembers.inviteError);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setLoadingAction(true);
    try {
      const ok = await cancelInvite(inviteId);
      if (!ok) {
        showFeedback("error", "Erro ao cancelar convite.");
        return;
      }
      showFeedback("success", "Convite cancelado com sucesso");
    } catch (err: any) {
      showFeedback("error", err.message || "Erro ao cancelar convite.");
    } finally {
      setLoadingAction(false);
    }
  };

  if (!hasOrganization) {
    return (
      <div className="p-8 text-center text-neutral-500">{t.organizationMembers.emptyState}</div>
    );
  }

  return (
    <div className="mx-auto w-full space-y-2">
      <OrganizationHeader />

      <div className="flex flex-col gap-4 rounded-md border border-neutral-200 bg-white px-4 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-neutral-800 dark:bg-neutral-900">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {t.organizationMembers.title}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {t.organizationMembers.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-md border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 dark:border-neutral-800">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Convites Pendentes</h2>
          {userCanManage && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-brand-primary-500 flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold text-neutral-950 shadow-sm transition-all hover:bg-yellow-600 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />{" "}
              <span className="whitespace-nowrap">{t.organizationMembers.inviteMember}</span>
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-col overflow-hidden rounded-md border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/50 dark:bg-neutral-950/50">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold tracking-wider text-neutral-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-[10px] font-bold tracking-wider text-neutral-500">
                    Nível
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold tracking-wider text-neutral-500">
                    {t.organizationMembers.tableActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {invites?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-xs text-neutral-500">
                      Nenhum convite pendente
                    </td>
                  </tr>
                ) : (
                  invites?.map((invite) => (
                    <tr
                      key={invite.invite_id}
                      className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-4 py-3 font-medium dark:text-white">{invite.email}</td>
                      <td className="px-4 py-3">
                        <Badge role={invite.role} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {userCanManage && (
                          <button
                            onClick={() => handleCancelInvite(invite.invite_id)}
                            disabled={loadingAction}
                            className="ml-auto flex items-center justify-end text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Cancelar Convite"
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
        loading={loadingAction}
        areas={areas}
      />
    </div>
  );
}
